class Deinflector {
  constructor() {
    this.path = "data/wordforms.json";
    this.wordforms = null;
  }

  async loadData() {
    this.wordforms = await Deinflector.loadData(this.path);
  }

  deinflect(term) {
    return this.wordforms[term] ? this.wordforms[term] : null;
  }

  static async loadData(path) {
    try {
      const response = await fetch(path, { method: "GET" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Failed to load data: ${error.message}`);
    }
  }
}
