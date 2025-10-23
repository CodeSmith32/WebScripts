/** Pretty-print JSON string. Returns string as is if JSON parse fails. */
export const prettifyJson = (json: string) => {
  let jsonData;
  try {
    jsonData = JSON.parse(json);
  } catch (_err) {
    return json;
  }
  return JSON.stringify(jsonData, null, "  ");
};

/** Prints tight-formatted JSON. Returns string as is if JSON parse fails. */
export const minifyJson = (json: string) => {
  let jsonData;
  try {
    jsonData = JSON.parse(json);
  } catch (_err) {
    return json;
  }
  return JSON.stringify(jsonData);
};
