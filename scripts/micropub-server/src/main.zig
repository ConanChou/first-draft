const std = @import("std");
const http = std.http;
const net = std.Io.net;
const Io = std.Io;
const Allocator = std.mem.Allocator;

// ── Config ────────────────────────────────────────────────────────────────────

pub const Config = struct {
    port: u16,
    token: []const u8,
    site_url: []const u8,
    scripts_dir: []const u8,
};

/// Parse a .env file and extract Micropub config fields.
/// Returns values that point into `buf` — buf must outlive the result.
pub fn parseEnv(contents: []const u8, buf: *EnvBuf) Config {
    var port: u16 = 4567;
    buf.token = "";
    buf.site_url = "https://example.com";
    buf.scripts_dir = "./scripts";

    var lines = std.mem.splitScalar(u8, contents, '\n');
    while (lines.next()) |line| {
        const stripped = if (line.len > 0 and line[line.len - 1] == '\r') line[0 .. line.len - 1] else line;
        if (stripped.len == 0 or stripped[0] == '#') continue;
        const eq = std.mem.indexOfScalar(u8, stripped, '=') orelse continue;
        const key = std.mem.trim(u8, stripped[0..eq], " \t");
        var val = std.mem.trim(u8, stripped[eq + 1 ..], " \t");
        // Strip surrounding quotes
        if (val.len >= 2 and val[0] == '"' and val[val.len - 1] == '"')
            val = val[1 .. val.len - 1];
        if (std.mem.eql(u8, key, "MICROPUB_PORT")) {
            port = std.fmt.parseInt(u16, val, 10) catch 4567;
        } else if (std.mem.eql(u8, key, "MICROPUB_TOKEN")) {
            buf.token = val;
        } else if (std.mem.eql(u8, key, "SITE_URL")) {
            buf.site_url = val;
        } else if (std.mem.eql(u8, key, "SCRIPTS_DIR")) {
            buf.scripts_dir = val;
        }
    }
    return .{
        .port = port,
        .token = buf.token,
        .site_url = buf.site_url,
        .scripts_dir = buf.scripts_dir,
    };
}

pub const EnvBuf = struct {
    token: []const u8 = "",
    site_url: []const u8 = "",
    scripts_dir: []const u8 = "",
};

// ── Body parsing ──────────────────────────────────────────────────────────────

/// Extract `name` from either form-urlencoded or JSON body.
/// Returns a slice into `buf`, or null if not found.
pub fn extractName(body: []const u8, content_type: ?[]const u8, buf: []u8) ?[]const u8 {
    const ct = content_type orelse "";
    if (std.mem.startsWith(u8, ct, "application/x-www-form-urlencoded")) {
        return extractFormField(body, "name", buf);
    } else if (std.mem.startsWith(u8, ct, "application/json")) {
        return extractJsonField(body, "name", buf);
    }
    // Try form-urlencoded as fallback
    return extractFormField(body, "name", buf);
}

fn extractFormField(body: []const u8, field: []const u8, buf: []u8) ?[]const u8 {
    var pairs = std.mem.splitScalar(u8, body, '&');
    while (pairs.next()) |pair| {
        const eq = std.mem.indexOfScalar(u8, pair, '=') orelse continue;
        const k = pair[0..eq];
        const v = pair[eq + 1 ..];
        if (std.mem.eql(u8, k, field)) {
            return uriDecode(v, buf);
        }
    }
    return null;
}

fn extractJsonField(body: []const u8, field: []const u8, buf: []u8) ?[]const u8 {
    // Minimal JSON string extraction: find `"<field>":"<value>"`
    // or `"<field>":["<value>", ...]` anywhere in body.
    var pos: usize = 0;
    while (pos < body.len) {
        const needle = field;
        const found = std.mem.indexOf(u8, body[pos..], needle) orelse break;
        const abs = pos + found;
        if (abs == 0 or body[abs - 1] != '"') {
            pos = abs + needle.len;
            continue;
        }
        const after_key = abs + needle.len;
        if (after_key >= body.len or body[after_key] != '"') {
            pos = after_key;
            continue;
        }

        var val_start = after_key + 1;
        while (val_start < body.len and (body[val_start] == ':' or body[val_start] == ' ')) val_start += 1;

        if (val_start < body.len and body[val_start] == '[') {
            val_start += 1;
            while (val_start < body.len and body[val_start] == ' ') val_start += 1;
        }

        if (val_start >= body.len or body[val_start] != '"') {
            pos = val_start;
            continue;
        }

        val_start += 1;
        var val_end = val_start;
        while (val_end < body.len) : (val_end += 1) {
            if (body[val_end] == '"' and (val_end == val_start or body[val_end - 1] != '\\')) break;
        }
        if (val_end >= body.len) break;

        const val = body[val_start..val_end];
        const n = @min(val.len, buf.len);
        @memcpy(buf[0..n], val[0..n]);
        return buf[0..n];
    }
    return null;
}

/// Decode percent-encoded URI component into buf. Returns slice of buf.
fn uriDecode(input: []const u8, buf: []u8) []const u8 {
    var out: usize = 0;
    var i: usize = 0;
    while (i < input.len and out < buf.len) {
        if (input[i] == '+') {
            buf[out] = ' ';
            out += 1;
            i += 1;
        } else if (input[i] == '%' and i + 2 < input.len) {
            const hi = input[i + 1];
            const lo = input[i + 2];
            const h = hexDigit(hi) orelse {
                buf[out] = input[i];
                out += 1;
                i += 1;
                continue;
            };
            const l = hexDigit(lo) orelse {
                buf[out] = input[i];
                out += 1;
                i += 1;
                continue;
            };
            buf[out] = (h << 4) | l;
            out += 1;
            i += 3;
        } else {
            buf[out] = input[i];
            out += 1;
            i += 1;
        }
    }
    return buf[0..out];
}

fn hexDigit(c: u8) ?u8 {
    return switch (c) {
        '0'...'9' => c - '0',
        'a'...'f' => c - 'a' + 10,
        'A'...'F' => c - 'A' + 10,
        else => null,
    };
}

// ── Server ────────────────────────────────────────────────────────────────────

const config_response =
    \\{"media-endpoint":null}
;

// Returned for unauthenticated GET / so iA Writer can discover the micropub endpoint.
// iA Writer fetches the domain entered in its URL field, reads <link rel="micropub">,
// then uses that href for ?q=config and POST calls (which require auth).
const discovery_html =
    \\<!DOCTYPE html><html><head>
    \\<link rel="micropub" href="https://firstdraftmicropub.internal">
    \\</head><body></body></html>
;

fn handleConnection(stream: net.Stream, io: Io, config: Config, gpa: Allocator) void {
    defer {
        var s = stream;
        s.close(io);
    }

    var recv_buf: [4096]u8 = undefined;
    var send_buf: [4096]u8 = undefined;
    var conn_reader = stream.reader(io, &recv_buf);
    var conn_writer = stream.writer(io, &send_buf);
    var server: http.Server = .init(&conn_reader.interface, &conn_writer.interface);

    while (true) {
        var request = server.receiveHead() catch |err| switch (err) {
            error.HttpConnectionClosing => return,
            error.HttpRequestTruncated => {
                std.log.debug("connection closed before full request received", .{});
                return;
            },
            else => {
                std.log.err("receive head: {s}", .{@errorName(err)});
                return;
            },
        };
        std.log.info("{s} {s}", .{ @tagName(request.head.method), request.head.target });
        serveRequest(&request, io, config, gpa) catch |err| {
            std.log.err("serve request: {s}", .{@errorName(err)});
            return;
        };
    }
}

fn checkAuth(request: *http.Server.Request, token: []const u8) bool {
    var headers = request.iterateHeaders();
    while (headers.next()) |header| {
        if (std.ascii.eqlIgnoreCase(header.name, "authorization")) {
            const expected_prefix = "Bearer ";
            if (std.mem.startsWith(u8, header.value, expected_prefix)) {
                const provided = header.value[expected_prefix.len..];
                return std.mem.eql(u8, provided, token);
            }
            return false;
        }
    }
    return false;
}

fn serveRequest(request: *http.Server.Request, io: Io, config: Config, gpa: Allocator) !void {
    const target = request.head.target;

    if (request.head.method == .GET) {
        // Unauthenticated GET / — discovery page. iA Writer fetches the domain it was
        // given, reads <link rel="micropub"> to find the endpoint, then GETs that
        // endpoint with auth for ?q=config.
        if (std.mem.eql(u8, target, "/") and !checkAuth(request, config.token)) {
            return request.respond(discovery_html, .{
                .status = .ok,
                .extra_headers = &.{
                    .{ .name = "content-type", .value = "text/html" },
                },
            });
        }
        if (!checkAuth(request, config.token)) {
            return request.respond("Unauthorized", .{ .status = .unauthorized });
        }
        // Authenticated GET — return capabilities JSON.
        return request.respond(config_response, .{
            .status = .ok,
            .extra_headers = &.{
                .{ .name = "content-type", .value = "application/json" },
            },
        });
    }

    if (request.head.method == .POST and
        (std.mem.eql(u8, target, "/") or std.mem.eql(u8, target, "/micropub")))
    {
        // Verify auth
        const auth_ok = checkAuth(request, config.token);

        if (!auth_ok) {
            return request.respond("Unauthorized", .{ .status = .unauthorized });
        }

        // Copy content_type before reading body — body read overwrites recv_buf,
        // invalidating any slices that point into it (including content_type).
        var ct_buf: [128]u8 = undefined;
        const content_type: ?[]const u8 = if (request.head.content_type) |ct| blk: {
            const n = @min(ct.len, ct_buf.len);
            @memcpy(ct_buf[0..n], ct[0..n]);
            break :blk ct_buf[0..n];
        } else null;

        // Read body
        var body_buf: [8192]u8 = undefined;
        var reader_transfer_buf: [4096]u8 = undefined;
        const body = blk: {
            request.head.expect = null;
            const body_reader = request.readerExpectNone(&reader_transfer_buf);
            const n = body_reader.readSliceShort(&body_buf) catch 0;
            break :blk body_buf[0..n];
        };

        // Extract name
        var name_buf: [512]u8 = undefined;
        const name = extractName(body, content_type, &name_buf);

        // Build publish command
        var argv_buf: [512]u8 = undefined;
        const publish_path = try std.fmt.bufPrint(&argv_buf, "{s}/publish", .{config.scripts_dir});

        var argv: [4][]const u8 = undefined;
        const argc: usize = if (name) |n| blk: {
            argv[0] = publish_path;
            argv[1] = "--title";
            argv[2] = n;
            break :blk 3;
        } else blk: {
            argv[0] = publish_path;
            argv[1] = "--latest-draft";
            break :blk 2;
        };

        // Respond 202 immediately — publish (link+build+deploy) takes 20-60s,
        // longer than iA Writer's request timeout. Client gets the ack right away;
        // we run publish after the response is flushed.
        var loc_buf: [256]u8 = undefined;
        const location = try std.fmt.bufPrint(&loc_buf, "{s}/", .{config.site_url});
        try request.respond("{}", .{
            .status = .accepted,
            .extra_headers = &.{
                .{ .name = "location", .value = location },
                .{ .name = "content-type", .value = "application/json" },
            },
        });

        // Run publish (response already sent).
        const result = std.process.run(gpa, io, .{
            .argv = argv[0..argc],
        }) catch |err| {
            std.log.err("publish failed: {s}", .{@errorName(err)});
            return;
        };
        defer gpa.free(result.stdout);
        defer gpa.free(result.stderr);

        if (result.term != .exited or result.term.exited != 0) {
            std.log.err("publish exited non-zero:\n{s}", .{result.stderr});
        } else {
            const out = std.mem.trim(u8, result.stdout, " \t\r\n");
            std.log.info("publish ok: {s}", .{out});
        }
    }

    return request.respond("Not Found", .{ .status = .not_found });
}

// ── Entry point ───────────────────────────────────────────────────────────────

pub fn main(init: std.process.Init) !void {
    const io = init.io;
    const gpa = init.gpa;

    // Read .env from cwd
    var env_buf: [8192]u8 = undefined;
    const env_contents = std.Io.Dir.cwd().readFile(io, ".env", &env_buf) catch |err| blk: {
        if (err == error.FileNotFound) {
            std.log.warn(".env not found, using defaults", .{});
            break :blk "";
        }
        return err;
    };

    var ebuf: EnvBuf = .{};
    const config = parseEnv(env_contents, &ebuf);

    if (config.token.len == 0) {
        std.log.err("MICROPUB_TOKEN not set in .env", .{});
        return error.MissingToken;
    }

    const addr = try net.IpAddress.parseIp4("127.0.0.1", config.port);
    var tcp_server = try addr.listen(io, .{ .reuse_address = true });
    defer tcp_server.deinit(io);

    std.log.info("micropub listening on 127.0.0.1:{d}", .{config.port});

    while (true) {
        const stream = tcp_server.accept(io) catch |err| {
            std.log.err("accept: {s}", .{@errorName(err)});
            continue;
        };
        handleConnection(stream, io, config, gpa);
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test "parseEnv: defaults when empty" {
    var ebuf: EnvBuf = .{};
    const cfg = parseEnv("", &ebuf);
    try std.testing.expectEqual(@as(u16, 4567), cfg.port);
    try std.testing.expectEqualStrings("", cfg.token);
}

test "parseEnv: parses all fields" {
    const env =
        \\MICROPUB_PORT="4444"
        \\MICROPUB_TOKEN="secret123"
        \\SITE_URL="https://example.com"
    ;
    var ebuf: EnvBuf = .{};
    const cfg = parseEnv(env, &ebuf);
    try std.testing.expectEqual(@as(u16, 4444), cfg.port);
    try std.testing.expectEqualStrings("secret123", cfg.token);
    try std.testing.expectEqualStrings("https://example.com", cfg.site_url);
}

test "parseEnv: skips comments and blank lines" {
    const env =
        \\# comment
        \\
        \\MICROPUB_TOKEN="tok"
    ;
    var ebuf: EnvBuf = .{};
    const cfg = parseEnv(env, &ebuf);
    try std.testing.expectEqualStrings("tok", cfg.token);
}

test "extractName: form-urlencoded" {
    var buf: [256]u8 = undefined;
    const name = extractName("name=Hello+World&h=entry", "application/x-www-form-urlencoded", &buf);
    try std.testing.expect(name != null);
    try std.testing.expectEqualStrings("Hello World", name.?);
}

test "extractName: form-urlencoded percent encoded" {
    var buf: [256]u8 = undefined;
    const name = extractName("name=Hello%20World", "application/x-www-form-urlencoded", &buf);
    try std.testing.expect(name != null);
    try std.testing.expectEqualStrings("Hello World", name.?);
}

test "extractName: JSON body" {
    var buf: [256]u8 = undefined;
    const body =
        \\{"type":["h-entry"],"properties":{"name":["My Post Title"]}}
    ;
    const name = extractName(body, "application/json", &buf);
    try std.testing.expect(name != null);
    try std.testing.expectEqualStrings("My Post Title", name.?);
}

test "extractName: simple JSON" {
    var buf: [256]u8 = undefined;
    const body =
        \\{"name":"A Title","content":"body text"}
    ;
    const name = extractName(body, "application/json", &buf);
    try std.testing.expect(name != null);
    try std.testing.expectEqualStrings("A Title", name.?);
}

test "extractName: missing name returns null" {
    var buf: [256]u8 = undefined;
    const name = extractName("h=entry&content=foo", "application/x-www-form-urlencoded", &buf);
    try std.testing.expect(name == null);
}

test "uriDecode: plus sign becomes space" {
    var buf: [64]u8 = undefined;
    const result = uriDecode("Hello+World", &buf);
    try std.testing.expectEqualStrings("Hello World", result);
}

test "uriDecode: percent encoding" {
    var buf: [64]u8 = undefined;
    const result = uriDecode("Hello%20World", &buf);
    try std.testing.expectEqualStrings("Hello World", result);
}
