/**
 * From https://stackoverflow.com/a/64028857/13561926
 * With the following changes:
 * - Add TS syntax
 * - Change indentation
 * - Changed `const fn = () => { ... }` to `function fn() { ... }`
 * - Changed console messages
 * 
 * I understand how it works.
 */

import { Log } from "./log.js";
const log = new Log('async-cleanup.ts');

type BeforeShutdownListener = (signalOrEvent?: string) => Promise<void>;

/**
 * System signals the app will listen to initiate shutdown.
 */
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'];

/**
 * Time in milliseconds to wait before forcing shutdown.
 */
const SHUTDOWN_TIMEOUT = 15_000;

/**
 * A queue of listener callbacks to execute before shutting
 * down the process.
 */
const shutdownListeners: BeforeShutdownListener[] = [];

/**
 * Listen for signals and execute given `fn` function once.
 * @param signals System signals to listen to.
 * @param fn Function to execute on shutdown.
 */
function processOnce(signals: string[], fn: (signalOrEvent: string) => void) {
    return signals.forEach(sig => process.once(sig, fn));
}

/**
 * Sets a forced shutdown mechanism that will exit the process after `timeout` milliseconds.
 * @param timeout Time to wait before forcing shutdown (milliseconds)
 */
function forceExitAfter(timeout: number) {
    return () => {
        setTimeout(() => {
            // Force shutdown after timeout
            console.warn(`Shutting down took longer than ${timeout}ms, forcing shutdown.`);
            log.w(`Shutting down took longer than ${timeout}ms, forcing shutdown.`);
            return process.exit(1);
        }, timeout).unref();
    };
}

/**
 * Main process shutdown handler. Will invoke every previously registered async shutdown listener
 * in the queue and exit with a code of `0`. Any `Promise` rejections from any listener will
 * be logged out as a warning, but won't prevent other callbacks from executing.
 * @param signalOrEvent The exit signal or event name received on the process.
 */
async function shutdownHandler(signalOrEvent: string) {
    console.warn('Shutting down');
    log.w('Shutting down, event:', signalOrEvent);

    for (const listener of shutdownListeners) {
        await listener(signalOrEvent);
    }

    log.w('Shutdown complete');

    return process.exit(0);
}

/**
 * Registers a new shutdown listener to be invoked before exiting
 * the main process. Listener handlers are guaranteed to be called in the order
 * they were registered.
 * @param listener The shutdown listener to register.
 * @returns Echoes back the supplied `listener`.
 */
export default function beforeShutdown(listener: BeforeShutdownListener): BeforeShutdownListener {
    shutdownListeners.push(listener);
    return listener;
}

// Register shutdown callback that kills the process after `SHUTDOWN_TIMEOUT` milliseconds
// This prevents custom shutdown handlers from hanging the process indefinitely
processOnce(SHUTDOWN_SIGNALS, forceExitAfter(SHUTDOWN_TIMEOUT));

// Register process shutdown callback
// Will listen to incoming signal events and execute all registered handlers in the stack
processOnce(SHUTDOWN_SIGNALS, shutdownHandler);