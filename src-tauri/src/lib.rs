use tauri::{Manager, Emitter, State};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::fs;
use std::io::{Read, Seek, SeekFrom, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::process::Command;
use std::time::{Duration, Instant, SystemTime};

#[cfg(target_os = "macos")]
#[repr(C)]
#[derive(Copy, Clone, Debug)]
struct CGPoint {
    x: f64,
    y: f64,
}

#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventCreate(source: *const std::ffi::c_void) -> *mut std::ffi::c_void;
    fn CGEventGetLocation(event: *const std::ffi::c_void) -> CGPoint;
    fn CGEventSourceCounterForEventType(state_id: i32, event_type: u32) -> u32;
    fn CGEventSourceKeyState(state_id: i32, key: u16) -> bool;
}

#[cfg(target_os = "macos")]
#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFRelease(cf: *const std::ffi::c_void);
}

#[cfg(target_os = "macos")]
fn get_macos_cursor_pos() -> Option<(f64, f64)> {
    unsafe {
        let ev = CGEventCreate(std::ptr::null());
        if ev.is_null() {
            return None;
        }
        let pt = CGEventGetLocation(ev);
        CFRelease(ev);
        Some((pt.x, pt.y))
    }
}

#[cfg(target_os = "macos")]
fn get_macos_event_counter(event_type: u32) -> u32 {
    unsafe {
        // Combine Session state (0) and HID system state (1)
        let c0 = CGEventSourceCounterForEventType(0, event_type);
        let c1 = CGEventSourceCounterForEventType(1, event_type);
        c0.wrapping_add(c1)
    }
}

#[cfg(target_os = "macos")]
fn is_macos_enter_pressed() -> bool {
    unsafe {
        // 36 = Return, 76 = Keypad Enter
        CGEventSourceKeyState(0, 36)
            || CGEventSourceKeyState(1, 36)
            || CGEventSourceKeyState(0, 76)
            || CGEventSourceKeyState(1, 76)
    }
}

#[derive(Clone, serde::Serialize)]
struct MousePosPayload {
    x: f64,
    y: f64,
}

#[derive(Clone, serde::Serialize)]
struct ScrollPayload {
    delta_x: i64,
    delta_y: i64,
}

#[derive(Clone, serde::Serialize)]
struct AiAgentPayload {
    state: String,
    message: String,
    agent: String,
}

#[derive(Clone, serde::Serialize)]
struct BrainContextPayload {
    active_app: String,
    ai_agent_working: bool,
    ai_agent_name: String,
    is_watching_video: bool,
}

#[tauri::command]
fn trigger_mac_action(action: String) {
    println!("Triggering mac action: {}", action);
}

struct PetBounds {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

struct AppState {
    bounds: Arc<Mutex<PetBounds>>,
}

#[tauri::command]
fn update_pet_bounds(x: f64, y: f64, width: f64, height: f64, state: State<'_, AppState>) {
    if let Ok(mut bounds) = state.bounds.lock() {
        bounds.x = x;
        bounds.y = y;
        bounds.width = width;
        bounds.height = height;
    }
}

fn url_decode(input: &str) -> String {
    let replaced = input.replace('+', " ");
    let mut result = String::with_capacity(replaced.len());
    let mut chars = replaced.chars();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                result.push(byte as char);
            }
        } else {
            result.push(c);
        }
    }
    result
}

fn read_last_line(path: &PathBuf) -> Option<String> {
    let mut file = fs::File::open(path).ok()?;
    let len = file.metadata().ok()?.len();
    if len == 0 {
        return None;
    }
    let seek_back = std::cmp::min(len, 4096);
    file.seek(SeekFrom::End(-(seek_back as i64))).ok()?;
    let mut buf = String::new();
    file.read_to_string(&mut buf).ok()?;
    buf.lines()
        .rev()
        .find(|l| !l.trim().is_empty())
        .map(|s| s.to_string())
}

// Strict live growth tracker for Claude Code: only returns Some("Claude Code")
// when a ~/.claude/projects/*/*.jsonl file has actively grown in byte size within the last 3.5 seconds
fn check_active_claude_code(
    file_sizes: &mut HashMap<PathBuf, (u64, Instant)>,
    initialized: &mut bool,
) -> Option<String> {
    let home = std::env::var("HOME").ok()?;
    let now_sys = SystemTime::now();
    let now_inst = Instant::now();

    let claude_projects = PathBuf::from(&home).join(".claude/projects");
    let mut active_claude = false;

    if let Ok(proj_dirs) = fs::read_dir(claude_projects) {
        for proj in proj_dirs.flatten() {
            if let Ok(files) = fs::read_dir(proj.path()) {
                for f in files.flatten() {
                    let path = f.path();
                    if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
                        continue;
                    }
                    if let Ok(meta) = fs::metadata(&path) {
                        let len = meta.len();
                        let recent_mod = meta
                            .modified()
                            .ok()
                            .and_then(|m| now_sys.duration_since(m).ok())
                            .map_or(false, |age| age <= Duration::from_secs(4));

                        if !*initialized {
                            file_sizes.insert(path, (len, now_inst - Duration::from_secs(10)));
                            continue;
                        }

                        let prev_entry = file_sizes.get(&path).cloned();
                        match prev_entry {
                            Some((prev_len, last_growth)) => {
                                if len > prev_len && recent_mod {
                                    file_sizes.insert(path.clone(), (len, now_inst));
                                    if let Some(last_line) = read_last_line(&path) {
                                        let is_done = last_line.contains("\"end_turn\"")
                                            || last_line.contains("\"stop_sequence\"")
                                            || last_line.contains("\"type\":\"summary\"")
                                            || last_line.contains("\"type\":\"result\"");
                                        if !is_done {
                                            active_claude = true;
                                        }
                                    }
                                } else if last_growth.elapsed() <= Duration::from_millis(3200) {
                                    if let Some(last_line) = read_last_line(&path) {
                                        let is_done = last_line.contains("\"end_turn\"")
                                            || last_line.contains("\"stop_sequence\"")
                                            || last_line.contains("\"type\":\"summary\"")
                                            || last_line.contains("\"type\":\"result\"");
                                        if !is_done {
                                            active_claude = true;
                                        }
                                    }
                                }
                            }
                            None => {
                                file_sizes.insert(
                                    path,
                                    (
                                        len,
                                        if recent_mod {
                                            now_inst
                                        } else {
                                            now_inst - Duration::from_secs(10)
                                        },
                                    ),
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    *initialized = true;
    if active_claude {
        Some("Claude Code".to_string())
    } else {
        None
    }
}

fn detect_system_context(
    file_sizes: &mut HashMap<PathBuf, (u64, Instant)>,
    initialized: &mut bool,
) -> BrainContextPayload {
    let mut active_app = String::new();
    let mut ai_agent_working = false;
    let mut ai_agent_name = String::new();
    let mut is_watching_video = false;

    // 1. Detect frontmost macOS app via lsappinfo
    if let Ok(front_out) = Command::new("lsappinfo").arg("front").output() {
        let front_asn = String::from_utf8_lossy(&front_out.stdout).trim().to_string();
        if !front_asn.is_empty() {
            if let Ok(info_out) = Command::new("lsappinfo")
                .args(["info", "-only", "name", &front_asn])
                .output()
            {
                let info_str = String::from_utf8_lossy(&info_out.stdout);
                if let Some(first_quote) = info_str.find('"') {
                    if let Some(last_quote) = info_str.rfind('"') {
                        if last_quote > first_quote {
                            active_app = info_str[first_quote + 1..last_quote].to_string();
                        }
                    }
                }
            }
        }
    }

    let lower_app = active_app.to_lowercase();
    if lower_app.contains("vlc")
        || lower_app.contains("iina")
        || lower_app.contains("quicktime")
        || lower_app.contains("tv")
        || lower_app.contains("netflix")
    {
        is_watching_video = true;
    }

    // 2. Check strict live Claude Code transcript byte-growth
    if let Some(agent_label) = check_active_claude_code(file_sizes, initialized) {
        ai_agent_working = true;
        ai_agent_name = agent_label;
    }

    BrainContextPayload {
        active_app,
        ai_agent_working,
        ai_agent_name,
        is_watching_video,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let mut init_x = 500.0;
            let mut init_y = 350.0;

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_ignore_cursor_events(false);
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let size = monitor.size();
                    let scale = monitor.scale_factor();
                    init_x = (size.width as f64 / scale) / 2.0 - 120.0;
                    init_y = (size.height as f64 / scale) / 2.0 - 120.0;
                    let _ = window.set_size(tauri::Size::Physical(*size));
                    let _ = window.set_position(tauri::Position::Physical(
                        tauri::PhysicalPosition { x: 0, y: 0 },
                    ));
                }
            }

            let bounds_state = Arc::new(Mutex::new(PetBounds {
                x: init_x,
                y: init_y,
                width: 260.0,
                height: 260.0,
            }));

            app.manage(AppState {
                bounds: bounds_state.clone(),
            });

            // Autonomous System Brain Thread: monitors active apps & strict Claude Code turns every 1.5s
            let app_handle_brain = app.handle().clone();
            std::thread::spawn(move || {
                let mut was_agent_working = false;
                let mut last_agent_name = String::from("Claude Code");
                let mut file_sizes: HashMap<PathBuf, (u64, Instant)> = HashMap::new();
                let mut initialized = false;

                loop {
                    std::thread::sleep(Duration::from_millis(1500));
                    let ctx = detect_system_context(&mut file_sizes, &mut initialized);

                    if ctx.ai_agent_working {
                        was_agent_working = true;
                        last_agent_name = ctx.ai_agent_name.clone();
                        let _ = app_handle_brain.emit(
                            "ai-agent-event",
                            AiAgentPayload {
                                state: "THINKING".to_string(),
                                message: format!("Thinking with {}...", ctx.ai_agent_name),
                                agent: ctx.ai_agent_name.clone(),
                            },
                        );
                    } else if was_agent_working {
                        was_agent_working = false;
                        let _ = app_handle_brain.emit(
                            "ai-agent-event",
                            AiAgentPayload {
                                state: "SUCCESS".to_string(),
                                message: format!("{} finished! Meow! 🎉", last_agent_name),
                                agent: last_agent_name.clone(),
                            },
                        );
                    }

                    let _ = app_handle_brain.emit("brain-context-update", ctx);
                }
            });

            // Local HTTP webhook listener (127.0.0.1:17380) for explicit CLI / Agent hooks
            let app_handle_agent = app.handle().clone();
            std::thread::spawn(move || {
                if let Ok(listener) = TcpListener::bind("127.0.0.1:17380") {
                    for stream in listener.incoming().flatten() {
                        let mut stream = stream;
                        let mut buffer = [0; 1024];
                        if let Ok(bytes_read) = stream.read(&mut buffer) {
                            let req = String::from_utf8_lossy(&buffer[..bytes_read]);
                            let first_line = req.lines().next().unwrap_or("");
                            let mut state = "THINKING".to_string();
                            let mut message = "Thinking...".to_string();
                            let mut agent = "Claude Code".to_string();

                            if let Some(q_idx) = first_line.find('?') {
                                let end_idx = first_line[q_idx..]
                                    .find(' ')
                                    .map(|i| q_idx + i)
                                    .unwrap_or(first_line.len());
                                let query = &first_line[q_idx + 1..end_idx];
                                for pair in query.split('&') {
                                    let mut kv = pair.splitn(2, '=');
                                    if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                                        match k {
                                            "state" | "mode" => state = url_decode(v).to_uppercase(),
                                            "msg" | "message" => message = url_decode(v),
                                            "agent" => agent = url_decode(v),
                                            _ => {}
                                        }
                                    }
                                }
                            }

                            let _ = app_handle_agent.emit(
                                "ai-agent-event",
                                AiAgentPayload {
                                    state,
                                    message,
                                    agent,
                                },
                            );

                            let response = "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 2\r\n\r\nOK";
                            let _ = stream.write_all(response.as_bytes());
                        }
                    }
                }
            });

            // Zero-permission macOS CoreGraphics 60Hz global input & click-through engine
            #[cfg(target_os = "macos")]
            {
                let bounds_state_cg = bounds_state.clone();
                let window_handle = app.get_webview_window("main").unwrap();
                let app_handle_input = app.handle().clone();

                std::thread::spawn(move || {
                    // Event type constants from <CoreGraphics/CGEventTypes.h>
                    const K_CG_EVENT_KEY_DOWN: u32 = 10;
                    const K_CG_EVENT_SCROLL_WHEEL: u32 = 22;

                    let mut last_key_count = get_macos_event_counter(K_CG_EVENT_KEY_DOWN);
                    let mut last_scroll_count = get_macos_event_counter(K_CG_EVENT_SCROLL_WHEEL);
                    let mut last_mouse_pos: (f64, f64) = (-1.0, -1.0);
                    let mut last_mouse_emit = Instant::now();
                    let mut last_scroll_emit = Instant::now();
                    let mut is_ignoring_cursor = false;

                    loop {
                        std::thread::sleep(Duration::from_millis(16));

                        // 1. Global Keyboard Detection (zero TCC permissions required)
                        let key_count = get_macos_event_counter(K_CG_EVENT_KEY_DOWN);
                        if key_count != last_key_count {
                            let diff = key_count.wrapping_sub(last_key_count).min(4);
                            last_key_count = key_count;
                            let key_label = if is_macos_enter_pressed() {
                                "Return"
                            } else {
                                "Key"
                            };
                            for _ in 0..diff.max(1) {
                                let _ = app_handle_input.emit("global-keydown", key_label.to_string());
                            }
                        }

                        // 2. Global Scroll Detection (zero TCC permissions required)
                        let scroll_count = get_macos_event_counter(K_CG_EVENT_SCROLL_WHEEL);
                        if scroll_count != last_scroll_count {
                            let diff = scroll_count.wrapping_sub(last_scroll_count).min(6) as i64;
                            last_scroll_count = scroll_count;
                            if last_scroll_emit.elapsed() >= Duration::from_millis(35) {
                                last_scroll_emit = Instant::now();
                                let _ = app_handle_input.emit(
                                    "global-scroll",
                                    ScrollPayload {
                                        delta_x: 0,
                                        delta_y: diff.max(1) * 14,
                                    },
                                );
                            }
                        }

                        // 3. Global Cursor Position & Click-Through Hit Testing (zero TCC permissions required)
                        if let Some((mx, my)) = get_macos_cursor_pos() {
                            // Account for macOS Menu Bar offset if window is positioned below menu bar
                            let mut win_offset_x = 0.0;
                            let mut win_offset_y = 0.0;
                            if let (Ok(pos), Ok(scale)) = (
                                window_handle.inner_position(),
                                window_handle.scale_factor(),
                            ) {
                                win_offset_x = pos.x as f64 / scale;
                                win_offset_y = pos.y as f64 / scale;
                            }

                            let local_x = mx - win_offset_x;
                            let local_y = my - win_offset_y;

                            if let Ok(bounds) = bounds_state_cg.lock() {
                                // Match against either window-local or global coordinates with safety margin
                                let hit_local = local_x >= bounds.x
                                    && local_x <= (bounds.x + bounds.width)
                                    && local_y >= bounds.y
                                    && local_y <= (bounds.y + bounds.height);
                                let hit_global = mx >= bounds.x
                                    && mx <= (bounds.x + bounds.width)
                                    && my >= bounds.y
                                    && my <= (bounds.y + bounds.height);
                                let intersects = hit_local || hit_global;

                                let should_ignore = !intersects;
                                if should_ignore != is_ignoring_cursor {
                                    is_ignoring_cursor = should_ignore;
                                    let _ = window_handle.set_ignore_cursor_events(should_ignore);
                                }
                            }

                            let moved = (mx - last_mouse_pos.0).abs() > 0.5
                                || (my - last_mouse_pos.1).abs() > 0.5;
                            if moved && last_mouse_emit.elapsed() >= Duration::from_millis(24) {
                                last_mouse_pos = (mx, my);
                                last_mouse_emit = Instant::now();
                                let _ = app_handle_input.emit(
                                    "global-mousemove",
                                    MousePosPayload {
                                        x: local_x,
                                        y: local_y,
                                    },
                                );
                            }
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            trigger_mac_action,
            update_pet_bounds
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

