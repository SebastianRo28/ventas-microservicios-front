import { Subject } from 'rxjs';

/** 403 module_not_enabled from the API (emitted by AuthInterceptor, shown by ContextoService as the commercial modal). */
export const moduloNoHabilitado$ = new Subject<string | null>();

/** 403 SUPPORT_READ_ONLY: a read-only support session tried to save. */
export const supportReadOnly$ = new Subject<void>();

/** The company's account is suspended (423 tenant_suspended, or the context says so): show "Cuenta suspendida". */
export const cuentaSuspendida$ = new Subject<void>();

/** 423 tenant_cancelled on a write: the account is cancelled and read-only. */
export const cuentaCancelada$ = new Subject<void>();

/** 503 tenant_maintenance: the company is being moved to its dedicated database (a few minutes). */
export const mantenimiento$ = new Subject<void>();
