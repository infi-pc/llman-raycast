import { matchResults } from "./matchResults";

describe("matchResults", () => {
  it("should match code", () => {
    const res = matchResults("```\nconst a = 1;```");
    expect(res).toEqual("const a = 1;");
  });

  it("should tagged code", () => {
    const res = matchResults("```js\nconst a = 1;```");
    expect(res).toEqual("const a = 1;");
  });

  it("should find code anywhere", () => {
    const res = matchResults("here is some texh\n\n```\nconst b = 2;\n```");
    expect(res).toEqual("const b = 2;");
  });
});
