import { NextRequest } from "next/server";
import { POST } from "../../app/api/render/route";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Mock the ffmpeg-ffprobe-static module
jest.mock("ffmpeg-ffprobe-static", () => ({
  ffmpegPath: "/usr/bin/ffmpeg", // Mock path for testing
}));

// Mock child_process exec
jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

// Mock fs/promises
jest.mock("fs/promises", () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
  mkdir: jest.fn(),
}));

import { exec } from "child_process";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;

describe("/api/render", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue();
    mockUnlink.mockResolvedValue();

    // Mock successful ffmpeg execution
    mockExec.mockImplementation((command, callback) => {
      if (callback) {
        callback(null, { stdout: "", stderr: "" } as any);
      }
      return {} as any;
    });

    // Mock successful file read
    mockReadFile.mockResolvedValue(Buffer.from("fake-image-data"));
  });

  const createMockFile = (
    name: string,
    content: string = "fake-content",
  ): File => {
    const blob = new Blob([content], { type: "image/png" });
    return new File([blob], name, { type: "image/png" });
  };

  const createMockFormData = (
    overrides: Record<string, any> = {},
  ): FormData => {
    const formData = new FormData();

    // Default values
    const defaults = {
      inputImage: createMockFile("input.gif"),
      reactionImage: createMockFile("reaction.png"),
      watermarkImage: createMockFile("watermark.png"),
      x: "650",
      y: "70",
      scale: "3",
      overlayEnabled: "true",
      watermarkScale: "3",
      watermarkPaddingX: "20",
      watermarkPaddingY: "30",
      imageExtension: "gif",
    };

    // Apply defaults and overrides
    Object.entries({ ...defaults, ...overrides }).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return formData;
  };

  describe("POST /api/render", () => {
    it("should process image with watermark successfully", async () => {
      const formData = createMockFormData();
      const request = new NextRequest("http://localhost:3000/api/render", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/gif");

      // Verify ffmpeg was called with correct parameters
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("/usr/bin/ffmpeg"),
        expect.any(Function),
      );

      // Verify the command includes watermark processing
      const ffmpegCommand = mockExec.mock.calls[0][0];
      expect(ffmpegCommand).toContain("-i");
      expect(ffmpegCommand).toContain("watermark.png");
      expect(ffmpegCommand).toContain("overlay=650:70");
      expect(ffmpegCommand).toContain("scale=iw/3:ih/3");
    });

    it("should process image without watermark", async () => {
      const formData = createMockFormData({
        overlayEnabled: "false",
        watermarkImage: null,
      });

      // Remove watermark image from form data
      formData.delete("watermarkImage");

      const request = new NextRequest("http://localhost:3000/api/render", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify ffmpeg was called without watermark
      const ffmpegCommand = mockExec.mock.calls[0][0];
      expect(ffmpegCommand).not.toContain("watermark.png");
      expect(ffmpegCommand).toContain("overlay=650:70");
    });

    it("should handle PNG images correctly", async () => {
      const formData = createMockFormData({
        imageExtension: "png",
      });

      const request = new NextRequest("http://localhost:3000/api/render", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");

      // Verify ffmpeg command doesn't include -f gif for PNG
      const ffmpegCommand = mockExec.mock.calls[0][0];
      expect(ffmpegCommand).not.toContain("-f gif");
    });

    it("should return 400 when missing required files", async () => {
      const formData = new FormData();
      formData.append("x", "650");
      formData.append("y", "70");

      const request = new NextRequest("http://localhost:3000/api/render", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Missing required files");
    });

    it("should handle ffmpeg execution errors", async () => {
      // Mock ffmpeg failure
      mockExec.mockImplementation((command, callback) => {
        if (callback) {
          callback(new Error("FFmpeg failed"), null);
        }
        return {} as any;
      });

      const formData = createMockFormData();
      const request = new NextRequest("http://localhost:3000/api/render", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to process image");
    });

    it("should clean up temporary files after processing", async () => {
      const formData = createMockFormData();
      const request = new NextRequest("http://localhost:3000/api/render", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      // Verify cleanup was attempted
      expect(mockUnlink).toHaveBeenCalledTimes(3); // input, reaction, output

      // Verify temp directory cleanup
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringMatching(/rm -rf ".*ffmpeg-.*"/),
        expect.any(Function),
      );
    });

    it("should handle different scale values correctly", async () => {
      const formData = createMockFormData({
        scale: "2.5",
      });

      const request = new NextRequest("http://localhost:3000/api/render", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      const ffmpegCommand = mockExec.mock.calls[0][0];
      expect(ffmpegCommand).toContain("scale=iw/2.5:ih/2.5");
    });

    it("should handle negative padding values", async () => {
      const formData = createMockFormData({
        watermarkPaddingX: "-170",
        watermarkPaddingY: "-30",
      });

      const request = new NextRequest("http://localhost:3000/api/render", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      const ffmpegCommand = mockExec.mock.calls[0][0];
      expect(ffmpegCommand).toContain("overlay=x=W-w--170:y=H-h--30");
    });

    it("should create unique temporary directories", async () => {
      const formData1 = createMockFormData();
      const formData2 = createMockFormData();

      const request1 = new NextRequest("http://localhost:3000/api/render", {
        method: "POST",
        body: formData1,
      });

      const request2 = new NextRequest("http://localhost:3000/api/render", {
        method: "POST",
        body: formData2,
      });

      await Promise.all([POST(request1), POST(request2)]);

      // Verify mkdir was called multiple times with different paths
      expect(mockMkdir).toHaveBeenCalledTimes(2);

      const call1Path = mockMkdir.mock.calls[0][0];
      const call2Path = mockMkdir.mock.calls[1][0];

      expect(call1Path).not.toBe(call2Path);
      expect(call1Path).toMatch(/ffmpeg-\d+-\w+/);
      expect(call2Path).toMatch(/ffmpeg-\d+-\w+/);
    });
  });

  describe("FFmpeg command generation", () => {
    it("should generate correct command for GIF with watermark", async () => {
      const formData = createMockFormData({
        imageExtension: "gif",
        x: "100",
        y: "200",
        scale: "2",
        watermarkScale: "1.5",
        watermarkPaddingX: "10",
        watermarkPaddingY: "20",
      });

      const request = new NextRequest("http://localhost:3000/api/render", {
        method: "POST",
        body: formData,
      });

      await POST(request);

      const ffmpegCommand = mockExec.mock.calls[0][0];

      // Verify command structure
      expect(ffmpegCommand).toContain("/usr/bin/ffmpeg");
      expect(ffmpegCommand).toContain("-y");
      expect(ffmpegCommand).toContain("-i");
      expect(ffmpegCommand).toContain("-filter_complex");
      expect(ffmpegCommand).toContain("-f gif");
      expect(ffmpegCommand).toContain("scale=1080:1080");
      expect(ffmpegCommand).toContain("scale=iw/2:ih/2");
      expect(ffmpegCommand).toContain("overlay=100:200");
      expect(ffmpegCommand).toContain("scale=iw*1.5:-1");
      expect(ffmpegCommand).toContain("overlay=x=W-w-10:y=H-h-20");
    });
  });
});
