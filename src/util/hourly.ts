import { Millis } from "~/constants";

const hourlyCallbacks = new Set<Function>();

const millisToNextFullHour = () => Millis.HOUR - (Date.now() % Millis.HOUR);

function runHourlyCallbacks() {
    for (const callback of hourlyCallbacks) {
        try {
            callback();
        } catch (err: any) {
            // let the global uncaught rejection handler handle this
            Promise.reject(new Error("Failed to run hourly callback", { cause: err }));
        }
    }

    setTimeout(runHourlyCallbacks, millisToNextFullHour());
}

setTimeout(runHourlyCallbacks, millisToNextFullHour());

export const hourly = (callback: Function) => {
    hourlyCallbacks.add(callback);
    return () => hourlyCallbacks.delete(callback);
};
