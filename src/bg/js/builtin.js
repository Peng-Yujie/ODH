class Builtin {
  constructor() {
    this.dicts = {};
  }

  async loadData() {
    this.dicts["collins"] = await Builtin.loadData("data/collins.json");
  }

  findTerm(dictname, term) {
    const dict = this.dicts[dictname];
    return dict.hasOwnProperty(term) ? JSON.stringify(dict[term]) : null;
  }

  static async loadData(path) {
    try {
      const response = await fetch(path, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to load data: ${error.message}`);
    }
  }
}
