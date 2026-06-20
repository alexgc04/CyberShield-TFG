import { describe, it, expect } from "vitest";
import { getSeverityFromLevel, timeAgo, getAgentStatusStyle } from "../services/wazuhService";

describe("Wazuh Service Helpers Tests", () => {
  
  describe("getSeverityFromLevel", () => {
    it("should return CRITICAL for level >= 14", () => {
      const res = getSeverityFromLevel(15);
      expect(res.label).toBe("CRITICAL");
      expect(res.color).toBe("text-destructive");
    });

    it("should return HIGH for levels between 11 and 13", () => {
      const res = getSeverityFromLevel(12);
      expect(res.label).toBe("HIGH");
      expect(res.color).toBe("text-neon-red");
    });

    it("should return MEDIUM for levels between 7 and 10", () => {
      const res = getSeverityFromLevel(8);
      expect(res.label).toBe("MEDIUM");
      expect(res.color).toBe("text-neon-yellow");
    });

    it("should return LOW for levels between 4 and 6", () => {
      const res = getSeverityFromLevel(5);
      expect(res.label).toBe("LOW");
      expect(res.color).toBe("text-neon-cyan");
    });

    it("should return INFO for levels < 4", () => {
      const res = getSeverityFromLevel(2);
      expect(res.label).toBe("INFO");
      expect(res.color).toBe("text-muted-foreground");
    });
  });

  describe("getAgentStatusStyle", () => {
    it("should return Activo style for active state", () => {
      const res = getAgentStatusStyle("active");
      expect(res.label).toBe("Activo");
      expect(res.badgeClass).toContain("text-neon-green");
    });

    it("should return Desconectado style for disconnected state", () => {
      const res = getAgentStatusStyle("disconnected");
      expect(res.label).toBe("Desconectado");
      expect(res.badgeClass).toContain("text-neon-red");
    });

    it("should return Pendiente style for pending state", () => {
      const res = getAgentStatusStyle("pending");
      expect(res.label).toBe("Pendiente");
      expect(res.badgeClass).toContain("text-neon-yellow");
    });

    it("should return Sin conexión style for unknown states", () => {
      const res = getAgentStatusStyle("unknown");
      expect(res.label).toBe("Sin conexión");
    });
  });

  describe("timeAgo", () => {
    it("should return Justo ahora for very recent timestamps", () => {
      const nowStr = new Date().toISOString();
      expect(timeAgo(nowStr)).toBe("Justo ahora");
    });

    it("should return Hace X min for minutes ago", () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(timeAgo(tenMinsAgo)).toBe("Hace 10 min");
    });

    it("should return Hace Xh for hours ago", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(timeAgo(twoHoursAgo)).toBe("Hace 2h");
    });
  });

});
