export const prettifyJson = (json: string) => {
  let jsonData;
  try {
    jsonData = JSON.parse(json);
  } catch (_err) {
    return json;
  }

  return JSON.stringify(jsonData, null, "  ");
};
