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

/** Tries to parse the json string. If successful, returns the parsed data. On failure, the json
 * string is returned. */
export const parseValidJson = (json: string) => {
  let jsonData;
  try {
    jsonData = JSON.parse(json);
  } catch (_err) {
    return json;
  }
  return jsonData;
};

/** If data is a string, it's returned as is. If it's an object, it's serialized as json.
 * The effect of this is to invert the operation of `parseValidJson`. */
export const stringifyValidJson = (data: unknown): string => {
  return typeof data === "string" ? data : JSON.stringify(data);
};
