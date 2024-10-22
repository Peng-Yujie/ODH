class Ankiconnect {
  constructor() {
    this.version = 6;
  }

  async ankiInvoke(action, params = {}, timeout = 3000) {
    let version = this.version;
    let request = { action, version, params };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch("http://127.0.0.1:8765", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (Object.getOwnPropertyNames(data).length != 2) {
        throw "response has an unexpected number of fields";
      }
      if (!data.hasOwnProperty("error")) {
        throw "response is missing required error field";
      }
      if (!data.hasOwnProperty("result")) {
        throw "response is missing required result field";
      }
      if (data.error) {
        throw data.error;
      }

      return data.result;
    } catch (e) {
      if (e.name === "AbortError") {
        console.error("Request timed out");
      }
      return Promise.reject(e);
    }
  }

  async addNote(note) {
    if (note) return await this.ankiInvoke("addNote", { note });
    else return Promise.resolve(null);
  }

  async getDeckNames() {
    return await this.ankiInvoke("deckNames");
  }

  async getModelNames() {
    return await this.ankiInvoke("modelNames");
  }

  async getModelFieldNames(modelName) {
    return await this.ankiInvoke("modelFieldNames", { modelName });
  }

  async getVersion() {
    let version = await this.ankiInvoke("version", {}, 100);
    return version ? "ver:" + version : null;
  }
}
