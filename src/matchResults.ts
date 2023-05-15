export function matchResults(results: string) {
  const codeResult = results.match(/```[\w]*([\s\S]*?)```/);

  const codeResultString = codeResult ? codeResult[1] : null;
  return codeResultString?.trim();
}
