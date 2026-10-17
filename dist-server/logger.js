function format(level, objOrMsg, msg) {
    const ts = new Date().toISOString();
    if (typeof objOrMsg === "string")
        return `${ts} [${level}] ${objOrMsg}`;
    if (msg)
        return `${ts} [${level}] ${msg} ${JSON.stringify(objOrMsg)}`;
    return `${ts} [${level}] ${JSON.stringify(objOrMsg)}`;
}
export const logger = {
    info: (objOrMsg, msg) => console.log(format("INFO", objOrMsg, msg)),
    error: (objOrMsg, msg) => console.error(format("ERROR", objOrMsg, msg)),
    warn: (objOrMsg, msg) => console.warn(format("WARN", objOrMsg, msg)),
    fatal: (objOrMsg, msg) => console.error(format("FATAL", objOrMsg, msg)),
};
