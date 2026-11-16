import { describe, expect, it } from "vitest";
import { defaultWorkspaceName, pickPrimaryWorkspace } from "./primary";

describe("pickPrimaryWorkspace", () => {
  it("returns null when there are no memberships", () => {
    expect(pickPrimaryWorkspace([])).toBeNull();
  });

  it("prefers oldest owned workspace over newer owned or member spaces", () => {
    const primary = pickPrimaryWorkspace([
      {
        role: "member",
        workspace: {
          id: "m1",
          name: "Invited",
          created_at: "2024-01-01T00:00:00Z",
        },
      },
      {
        role: "owner",
        workspace: {
          id: "o2",
          name: "Newer owned",
          created_at: "2024-06-01T00:00:00Z",
        },
      },
      {
        role: "owner",
        workspace: {
          id: "o1",
          name: "Oldest owned",
          created_at: "2024-02-01T00:00:00Z",
        },
      },
    ]);
    expect(primary?.id).toBe("o1");
  });

  it("falls back to oldest membership when user owns none", () => {
    const primary = pickPrimaryWorkspace([
      {
        role: "admin",
        workspace: {
          id: "a2",
          name: "Later invite",
          created_at: "2025-01-01T00:00:00Z",
        },
      },
      {
        role: "member",
        workspace: {
          id: "a1",
          name: "First invite",
          created_at: "2024-08-01T00:00:00Z",
        },
      },
    ]);
    expect(primary?.id).toBe("a1");
  });
});

describe("defaultWorkspaceName", () => {
  it("uses full name, then email local-part, then fallback", () => {
    expect(defaultWorkspaceName("Ana Pérez", "ana@example.com")).toBe(
      "Espacio de Ana Pérez",
    );
    expect(defaultWorkspaceName("", "ana@example.com")).toBe("Espacio de ana");
    expect(defaultWorkspaceName(null, null)).toBe("Mi espacio");
  });
});
