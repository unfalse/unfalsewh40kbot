import { describe, it, expect } from "vitest";
import { UrlUtil } from "../../src/util/url";

describe("UrlUtil.assertPublicHttpUrl", () => {
  it("does not throw for valid https URL", () => {
    expect(() => UrlUtil.assertPublicHttpUrl("https://example.com")).not.toThrow();
  });

  it("does not throw for valid http URL", () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://example.com")).not.toThrow();
  });

  it("returns a URL object", () => {
    const result = UrlUtil.assertPublicHttpUrl("https://example.com");
    expect(result).toBeInstanceOf(URL);
    expect(result.hostname).toBe("example.com");
  });

  it('throws "forbidden_host" for localhost', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://localhost")).toThrow("forbidden_host");
  });

  it('throws "forbidden_host" for 127.0.0.1', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://127.0.0.1")).toThrow("forbidden_host");
  });

  it('throws "forbidden_host" for 0.0.0.0', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://0.0.0.0")).toThrow("forbidden_host");
  });

  it('throws "forbidden_host" for subdomain of localhost', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://something.localhost")).toThrow("forbidden_host");
  });

  it('throws "forbidden_host" for AWS/GCP metadata IP 169.254.169.254', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://169.254.169.254")).toThrow("forbidden_host");
  });

  it('throws "private_ip" for 10.x range', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://10.0.0.1")).toThrow("private_ip");
  });

  it('throws "private_ip" for 192.168.x range', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://192.168.1.1")).toThrow("private_ip");
  });

  it('throws "private_ip" for 172.16.x range', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://172.16.0.1")).toThrow("private_ip");
  });

  it('throws "private_ip" for 172.31.255.255', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://172.31.255.255")).toThrow("private_ip");
  });

  it('throws "bad_protocol" for ftp://', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("ftp://example.com")).toThrow("bad_protocol");
  });

  it('throws "invalid_url" for a completely invalid string', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("not-a-url")).toThrow("invalid_url");
  });

  it('throws "forbidden_host" for IPv6 loopback http://[::1]', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://[::1]")).toThrow("forbidden_host");
  });

  it('throws "forbidden_host" for GCP metadata endpoint', () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://metadata.google.internal")).toThrow("forbidden_host");
  });

  it("allows 172.32.0.1 (outside private 172.16–172.31 range)", () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://172.32.0.1")).not.toThrow();
  });

  it("allows 172.15.0.1 (below 172.16, not private)", () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://172.15.0.1")).not.toThrow();
  });

  it("allows 11.0.0.1 (not in any private range)", () => {
    expect(() => UrlUtil.assertPublicHttpUrl("http://11.0.0.1")).not.toThrow();
  });
});

describe("UrlUtil.extractFirstHttpUrl", () => {
  it("extracts the first URL from plain text", () => {
    expect(UrlUtil.extractFirstHttpUrl("Visit https://example.com today")).toBe("https://example.com");
  });

  it("extracts an http:// (non-https) URL", () => {
    expect(UrlUtil.extractFirstHttpUrl("Visit http://example.org today")).toBe("http://example.org");
  });

  it("returns undefined when text contains no URL", () => {
    expect(UrlUtil.extractFirstHttpUrl("No URL here")).toBeUndefined();
  });

  it("returns the first URL when multiple URLs are present", () => {
    const result = UrlUtil.extractFirstHttpUrl(
      "https://first.com and https://second.com",
    );
    expect(result).toBe("https://first.com");
  });
});

describe("UrlUtil.collectUrlsFromMessage", () => {
  it("returns empty array when text has no URLs and no entities are provided", () => {
    expect(UrlUtil.collectUrlsFromMessage("No URLs here")).toEqual([]);
  });

  it("returns empty array when text has no URLs and entities array is empty", () => {
    expect(UrlUtil.collectUrlsFromMessage("Just text", [])).toEqual([]);
  });

  it('extracts URL from a "url" entity type', () => {
    const text = "https://example.com is great";
    const entities = [{ type: "url", offset: 0, length: 19 }];
    const result = UrlUtil.collectUrlsFromMessage(text, entities);
    expect(result).toContain("https://example.com");
  });

  it('extracts URL from a "text_link" entity using entity.url', () => {
    const text = "Click here";
    const entities = [
      { type: "text_link", offset: 0, length: 10, url: "https://linked.com" },
    ];
    const result = UrlUtil.collectUrlsFromMessage(text, entities);
    expect(result).toContain("https://linked.com");
  });

  it("falls back to regex extraction when entities array is empty", () => {
    const result = UrlUtil.collectUrlsFromMessage("Visit https://example.com", []);
    expect(result).toContain("https://example.com");
  });

  it("deduplicates URLs that appear both in entities and in the regex pass", () => {
    const text = "https://example.com is great";
    const entities = [{ type: "url", offset: 0, length: 19 }];
    const result = UrlUtil.collectUrlsFromMessage(text, entities);
    expect(result.filter((u) => u === "https://example.com")).toHaveLength(1);
  });

  it("returns URLs from both entity types and regex without duplicates", () => {
    const text = "See https://regex.com and click here";
    const entities = [
      // "click here" spans offset 26, length 10; text_link uses entity.url not the text slice
      { type: "text_link", offset: 26, length: 10, url: "https://linked.com" },
    ];
    const result = UrlUtil.collectUrlsFromMessage(text, entities);
    expect(result).toContain("https://linked.com");
    expect(result).toContain("https://regex.com");
  });

  it("silently skips text_link entity with no url field", () => {
    const result = UrlUtil.collectUrlsFromMessage("click here", [
      { type: "text_link", offset: 0, length: 5 }, // no url
    ]);
    expect(result).toEqual([]);
  });
});
