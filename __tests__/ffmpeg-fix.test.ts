// Test the runtime path resolution function used in the API
function getFfmpegPath() {
  try {
    const ffmpegStatic = require("ffmpeg-ffprobe-static");
    return ffmpegStatic.ffmpegPath;
  } catch (error) {
    console.error("Failed to load ffmpeg-ffprobe-static:", error);
    throw new Error("FFmpeg not available");
  }
}

describe("FFmpeg Static Binary Import Fix", () => {
  test("should import ffmpegPath correctly via require", () => {
    const ffmpegStatic = require("ffmpeg-ffprobe-static");
    expect(ffmpegStatic.ffmpegPath).toBeDefined();
    expect(typeof ffmpegStatic.ffmpegPath).toBe("string");
    expect(ffmpegStatic.ffmpegPath).toContain("ffmpeg");
  });

  test("should not be an object (original bug)", () => {
    // This test verifies the original bug is fixed
    // The original error was: "[object Object]" command not found
    const ffmpegStatic = require("ffmpeg-ffprobe-static");
    expect(typeof ffmpegStatic.ffmpegPath).not.toBe("object");
    expect(ffmpegStatic.ffmpegPath).not.toBe("[object Object]");
  });

  test("should be a valid path string", () => {
    const ffmpegStatic = require("ffmpeg-ffprobe-static");
    expect(ffmpegStatic.ffmpegPath).toMatch(/ffmpeg$/);
  });

  test("runtime path resolution function should work", () => {
    const path = getFfmpegPath();
    expect(path).toBeDefined();
    expect(typeof path).toBe("string");
    expect(path).toContain("ffmpeg");
  });
});
