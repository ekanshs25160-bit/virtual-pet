use tauri::{Manager, Emitter, State};
use std::sync::{Arc, Mutex};

#[tauri::command]
fn trigger_mac_action(action: String) {
    println!("Triggering mac action: {}", action);
    // You can implement specific osascript or shell commands here
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
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      if let Some(window) = app.get_webview_window("main") {
          
          // Maximize window to monitor size
          if let Ok(Some(monitor)) = window.primary_monitor() {
              let size = monitor.size();
              let _ = window.set_size(tauri::Size::Physical(*size));
              let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: 0, y: 0 }));
          }
      }

      let bounds_state = Arc::new(Mutex::new(PetBounds {
          x: 0.0,
          y: 0.0,
          width: 0.0,
          height: 0.0,
      }));
      
      app.manage(AppState {
          bounds: bounds_state.clone(),
      });
      
      let app_handle = app.handle().clone();
      let (tx, rx) = std::sync::mpsc::channel::<String>();
      
      // Thread to emit events to Tauri
      std::thread::spawn(move || {
          while let Ok(key_str) = rx.recv() {
              let _ = app_handle.emit("global-keydown", key_str);
          }
      });

      let bounds_state_clone = bounds_state.clone();
      let window_handle = app.get_webview_window("main").unwrap();
      
      // Thread for rdev listener (macOS CGEventTap)
      std::thread::spawn(move || {
          let mut is_hovered = false;
          
          let _ = rdev::listen(move |event| {
              match event.event_type {
                  rdev::EventType::KeyPress(key) => {
                      // Send event through channel instead of calling emit directly to avoid trapping
                      let _ = tx.send(format!("{:?}", key));
                  }
                  rdev::EventType::MouseMove { x, y } => {
                      if let Ok(bounds) = bounds_state_clone.lock() {
                          let intersects = x >= bounds.x && x <= (bounds.x + bounds.width) &&
                                           y >= bounds.y && y <= (bounds.y + bounds.height);
                          
                          if intersects != is_hovered {
                              is_hovered = intersects;
                              let _ = window_handle.set_ignore_cursor_events(!intersects);
                          }
                      }
                  }
                  _ => {}
              }
          });
      });
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![trigger_mac_action, update_pet_bounds])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
