use tauri::{Manager, Emitter};

#[tauri::command]
fn trigger_mac_action(action: String) {
    println!("Triggering mac action: {}", action);
    // You can implement specific osascript or shell commands here
}

#[tauri::command]
fn set_click_through(window: tauri::Window, ignore: bool) {
    let _ = window.set_ignore_cursor_events(ignore);
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
      
      // Make the window ignore cursor events by default so it's a true desktop overlay
      if let Some(window) = app.get_webview_window("main") {
          let _ = window.set_ignore_cursor_events(true);
          
          // Maximize window to monitor size
          if let Ok(Some(monitor)) = window.primary_monitor() {
              let size = monitor.size();
              let _ = window.set_size(tauri::Size::Physical(*size));
              let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: 0, y: 0 }));
          }
      }
      
      let app_handle = app.handle().clone();
      std::thread::spawn(move || {
          let _ = rdev::listen(move |event| {
              if let rdev::EventType::KeyPress(_) = event.event_type {
                  let _ = app_handle.emit("global-keydown", ());
              }
          });
      });
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![trigger_mac_action, set_click_through])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
