let _fn = null;
export function registerNotifier(fn) {
    _fn = fn;
}
export async function notifyOwner(msg) {
    if (_fn)
        await _fn(msg).catch(() => { });
}
