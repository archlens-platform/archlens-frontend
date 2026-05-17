import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileUploader } from "./file-uploader";

describe("FileUploader", () => {
  it("renders drop zone with instructions", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    expect(screen.getByText("Drop your architecture diagram here")).toBeInTheDocument();
    expect(screen.getByText(/PNG, JPEG, WebP or PDF/)).toBeInTheDocument();
  });

  it("shows browse files button", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    expect(screen.getByText("Browse files")).toBeInTheDocument();
  });

  it("accepts valid file via input change", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["data"], "diagram.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("diagram.png")).toBeInTheDocument();
    expect(screen.getByText("Analyze Diagram")).toBeInTheDocument();
  });

  it("shows error for unsupported file type", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["data"], "doc.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("Unsupported file type. Use PNG, JPEG, WebP or PDF.")).toBeInTheDocument();
  });

  it("shows error for file too large", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const bigData = new Uint8Array(21 * 1024 * 1024);
    const file = new File([bigData], "huge.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("File too large. Maximum is 20MB.")).toBeInTheDocument();
  });

  it("calls onUpload when analyze button is clicked", () => {
    const onUpload = vi.fn();
    render(<FileUploader onUpload={onUpload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["data"], "test.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByText("Analyze Diagram"));
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it("shows loading state when isUploading", () => {
    render(<FileUploader onUpload={vi.fn()} isUploading />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["data"], "test.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
  });

  it("allows removing selected file", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["data"], "test.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("test.png")).toBeInTheDocument();

    const removeBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(removeBtn);

    expect(screen.queryByText("test.png")).not.toBeInTheDocument();
    expect(screen.getByText("Drop your architecture diagram here")).toBeInTheDocument();
  });

  it("accepts PDF files", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["data"], "arch.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("arch.pdf")).toBeInTheDocument();
  });

  it("accepts JPEG files", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["data"], "arch.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("arch.jpg")).toBeInTheDocument();
  });

  it("accepts WebP files", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["data"], "arch.webp", { type: "image/webp" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("arch.webp")).toBeInTheDocument();
  });

  it("handles drag over event", () => {
    const { container } = render(<FileUploader onUpload={vi.fn()} />);
    const dropZone = container.querySelector("[class*='border-dashed']")!;

    fireEvent.dragOver(dropZone, { preventDefault: vi.fn() });
    expect(dropZone.className).toContain("border-primary");
  });

  it("handles drag leave event", () => {
    const { container } = render(<FileUploader onUpload={vi.fn()} />);
    const dropZone = container.querySelector("[class*='border-dashed']")!;

    fireEvent.dragOver(dropZone, { preventDefault: vi.fn() });
    fireEvent.dragLeave(dropZone);
    expect(dropZone.className).not.toContain("border-primary bg-primary");
  });

  it("handles file drop", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const dropZone = document.querySelector("[class*='border-dashed']")!;

    const file = new File(["data"], "dropped.png", { type: "image/png" });
    fireEvent.drop(dropZone, {
      preventDefault: vi.fn(),
      dataTransfer: { files: [file] },
    });

    expect(screen.getByText("dropped.png")).toBeInTheDocument();
  });

  it("does not call onUpload when isUploading", () => {
    const onUpload = vi.fn();
    render(<FileUploader onUpload={onUpload} isUploading />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["data"], "test.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByText("Analyzing..."));
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("shows file size in MB", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const data = new Uint8Array(2 * 1024 * 1024);
    const file = new File([data], "big.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("2.00 MB")).toBeInTheDocument();
  });

  it("renders drop zone with role='button' and tabIndex=0", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const dropZone = document.querySelector("[class*='border-dashed']")!;
    expect(dropZone).toHaveAttribute("role", "button");
    expect(dropZone).toHaveAttribute("tabindex", "0");
  });

  it("opens file dialog on Enter keypress", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const dropZone = document.querySelector("[class*='border-dashed']")!;
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.keyDown(dropZone, { key: "Enter" });
    expect(clickSpy).toHaveBeenCalled();
  });

  it("opens file dialog on Space keypress", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const dropZone = document.querySelector("[class*='border-dashed']")!;
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.keyDown(dropZone, { key: " " });
    expect(clickSpy).toHaveBeenCalled();
  });

  it("does not open file dialog on other key presses", () => {
    render(<FileUploader onUpload={vi.fn()} />);
    const dropZone = document.querySelector("[class*='border-dashed']")!;
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.keyDown(dropZone, { key: "Tab" });
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
