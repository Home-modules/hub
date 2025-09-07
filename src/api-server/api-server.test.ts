import { expect, test } from "bun:test";
import type { HMApi } from "../plugins.ts";
import settings from "../../data/settings.json"
const port = settings.port || 80;
const base = `http://localhost:${port}/`

const invalidRequest: HMApi.ResponseOrError<HMApi.Request> = {
    type: "error",
    error: {
        code: 400,
        message: "INVALID_REQUEST"
    }
};
const invalidToken: HMApi.ResponseOrError<HMApi.Request> = {
    type: "error",
    error: {
        code: 401,
        message: "TOKEN_INVALID"
    }
};

test("API server tests", async () => {
    // Start server
    await (await import("../index.ts")).init();

    // Test webapp hosting
    expect(await (await Bun.fetch(base+'webapp/')).text()).toStartWith("<!doctype html>");
    // Test `/` redirect
    expect(await (await Bun.fetch(base)).text()).toStartWith("<!doctype html>");
    // Test GET `/request/` errors (no token or data)
    expect(await (await Bun.fetch(base + 'request/')).json()).toEqual(invalidRequest);
    // Test GET `/request/null` errors (no data)
    expect(await (await Bun.fetch(base + 'request/null')).json()).toEqual(invalidRequest);
    // Test GET `/request/null/<data>` checks token
    expect(await (await Bun.fetch(base + 'request/null/{"type":"empty"}')).json()).toEqual(invalidToken);
    // Test login does not check token
    expect(await (await Bun.fetch(base + 'request/null/{"type":"account.login"}')).json()).not.toEqual(invalidToken);
    // Test login works
    const loginRes = await (await Bun.fetch(base + 'request/null/' + JSON.stringify({
        "type": "account.login", "username": "admin", "password": "admin", "device": "a"
    }))).json() as HMApi.ResponseOrError<HMApi.Request.Account.Login>;
    expect(loginRes.type).toBe("ok");
    if (loginRes.type == "error") return;
    expect(loginRes.data.token).toStartWith("admin:");
    const token = loginRes.data.token;
    // Test new token works
    expect(await (await Bun.fetch(base + `request/${token}/{"type":"empty"}`)).json()).not.toEqual(invalidToken);
    // Test POST without token or data errors
    expect(await (await Bun.fetch(base + `request/`, {method: "POST"})).json())
        .toEqual({ type: "error", error: { code: 400, message: "INVALID_REQUEST_JSON" } });
    // Test POST without token errors
    expect(await (await Bun.fetch(base + `request/`, { method: "POST", body: '{"type": "empty"}'})).json()).toEqual(invalidToken);
    // Test POST with token is ok
    expect(await (await Bun.fetch(base + `request/${token}/`, { method: "POST", body: '{"type": "empty"}'})).json()).toEqual({type:"ok", data:{}});
});