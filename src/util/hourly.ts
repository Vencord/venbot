import { Millis } from "~/constants";

const hourlyCallbacks = new Set<Function>();

const millisToNextFullHour = () => Millis.HOUR - (Date.now() % Millis.HOUR);

function runHourlyCallbacks() {
    for (const callback of hourlyCallbacks) {
        callback();
    }

    setTimeout(runHourlyCallbacks, millisToNextFullHour());
}

setTimeout(runHourlyCallbacks, millisToNextFullHour());

export const hourly = (callback: Function) => {
    hourlyCallbacks.add(callback);
    return () => hourlyCallbacks.delete(callback);
};
