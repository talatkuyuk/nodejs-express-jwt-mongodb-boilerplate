const EventEmitter = require("node:events");

const unhandledErrors = require("../testutils/unhandledErrors");

describe("Process events", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should handle uncaughtException", () => {
    const error = new Error("Server internal error");

    const mockProcess = new EventEmitter();
    jest.spyOn(process, "on").mockImplementation((event, listener) => {
      if (event === "uncaughtException") {
        listener(error);
      }

      mockProcess.on(event, listener);
      return process;
    });

    jest.spyOn(console, "error").mockReturnValueOnce();
    // @ts-ignore
    jest.spyOn(process, "exit").mockReturnValueOnce();

    unhandledErrors();

    expect(process.on).toHaveBeenCalledWith("uncaughtException", expect.any(Function));
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith("Server internal error");
  });

  test("should handle unhandledRejection", () => {
    const error = new Error("dead lock");

    const mockProcess = new EventEmitter();
    jest.spyOn(process, "on").mockImplementation((event, listener) => {
      if (event === "unhandledRejection") {
        listener(error);
      }

      mockProcess.on(event, listener);
      return process;
    });

    expect(() => unhandledErrors()).toThrow("dead lock");
    expect(process.on).toHaveBeenCalledWith("unhandledRejection", expect.any(Function));
  });
});
