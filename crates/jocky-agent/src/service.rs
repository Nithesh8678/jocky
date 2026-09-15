use std::{ffi::OsString, sync::atomic::Ordering, time::Duration};
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    service_dispatcher,
};
define_windows_service!(service_main, entry);
pub fn dispatch() -> Result<(), String> {
    service_dispatcher::start("JockyAgent", service_main).map_err(|e| e.to_string())
}
fn entry(_args: Vec<OsString>) {
    let handle = match service_control_handler::register("JockyAgent", |event| match event {
        ServiceControl::Stop => {
            super::STOP.store(true, Ordering::Relaxed);
            ServiceControlHandlerResult::NoError
        }
        ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
        _ => ServiceControlHandlerResult::NotImplemented,
    }) {
        Ok(h) => h,
        Err(_) => return,
    };
    let status = |state, code| ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: state,
        controls_accepted: if state == ServiceState::Running {
            ServiceControlAccept::STOP
        } else {
            ServiceControlAccept::empty()
        },
        exit_code: ServiceExitCode::Win32(code),
        checkpoint: 0,
        wait_hint: Duration::from_secs(60),
        process_id: None,
    };
    let _ = handle.set_service_status(status(ServiceState::Running, 0));
    let result = super::main_loop();
    if let Err(ref e) = result {
        if let Some(parent) = super::config_path().parent() {
            let _ = std::fs::write(
                parent.join("service-error.log"),
                format!("{} {e}\n", chrono::Utc::now()),
            );
        }
    }
    let _ = handle.set_service_status(status(
        ServiceState::Stopped,
        if result.is_ok() { 0 } else { 1 },
    ));
}
