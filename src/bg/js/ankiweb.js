class Ankiweb {
  constructor() {
    this.profile = null;
    this.version = "web";
    this.id = "";
    this.password = "";
    chrome.webRequest.onBeforeSendHeaders.addListener(
      this.rewriteHeader,
      {
        urls: [
          "https://ankiweb.net/account/login",
          "https://ankiuser.net/edit/save",
        ],
      },
      ["requestHeaders", "blocking", "extraHeaders"]
    );
  }

  async initConnection(options, forceLogout = false) {
    const retryCount = 1;
    this.id = options.id;
    this.password = options.password;
    this.profile = await this.getProfile(retryCount, forceLogout);
    return;
  }

  async addNote(note) {
    return note && this.profile
      ? await this.saveNote(note)
      : Promise.resolve(null);
  }

  async getDeckNames() {
    return this.profile ? this.profile.decknames : null;
  }

  async getModelNames() {
    return this.profile ? this.profile.modelnames : null;
  }

  async getModelFieldNames(modelName) {
    return this.profile ? this.profile.modelfieldnames[modelName] : null;
  }

  async getVersion() {
    return this.profile ? this.version : null;
  }

  // --- Ankiweb API
  async api_connect(forceLogout = false) {
    const url = forceLogout
      ? "https://ankiweb.net/account/logout"
      : "https://ankiuser.net/edit/";
    try {
      const response = await fetch(url);
      const result = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(result, "text/html");
      const title = doc.querySelectorAll("h1");
      if (!title.length) throw new Error("No title found");
      switch (title[0].innerText) {
        case "Add":
          return {
            action: "edit",
            data: await this.parseData(result),
          };
        case "Log in":
          return {
            action: "login",
            data: doc
              .querySelector("input[name=csrf_token]")
              .getAttribute("value"),
          };
        default:
          throw new Error("Unexpected title");
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async api_login(id, password, token) {
    const info = new URLSearchParams({
      submitted: "1",
      username: id,
      password: password,
      csrf_token: token,
    });

    try {
      const response = await fetch("https://ankiweb.net/account/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: info,
      });

      const result = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(result, "text/html");
      const title = doc.querySelectorAll("h1");

      if (!title.length) throw new Error("No title found");
      if (title[0].innerText === "Decks") {
        return true;
      } else {
        throw new Error("Login failed");
      }
    } catch (error) {
      return Promise.reject(false);
    }
  }

  async api_save(note, profile) {
    let fields = [];
    for (const field of profile.modelfieldnames[note.modelName]) {
      let fielddata = note.fields[field] ? note.fields[field] : "";
      fields.push(fielddata);
    }

    let data = [fields, note.tags.join(" ")];
    let dict = {
      csrf_token: profile.token,
      data: JSON.stringify(data),
      mid: profile.modelids[note.modelName],
      deck: profile.deckids[note.deckName],
    };

    try {
      const response = await fetch("https://ankiuser.net/edit/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(dict),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return null;
    }
  }

  async getAddInfo() {
    try {
      const response = await fetch("https://ankiuser.net/edit/getAddInfo", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return null;
    }
  }

  async getNotetypeFields(nid) {
    try {
      const response = await fetch(
        `https://ankiuser.net/edit/getNotetypeFields?ntid=${nid}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return null;
    }
  }

  async getProfile(retryCount = 1, forceLogout = false) {
    try {
      let resp = await this.api_connect(forceLogout);
      if (resp.action == "edit") {
        return resp.data;
      } else if (
        retryCount > 0 &&
        resp.action == "login" &&
        (await this.api_login(this.id, this.password, resp.data))
      ) {
        return this.getProfile(retryCount - 1);
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }
  }

  async saveNote(note, retryCount = 1) {
    try {
      let resp = await this.api_save(note, this.profile);
      if (resp != null) {
        return true;
      } else if (retryCount > 0 && (this.profile = await this.getProfile())) {
        return this.saveNote(note, retryCount - 1);
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }
  }

  async getAddInfo() {
    try {
      const response = await fetch("https://ankiuser.net/edit/getAddInfo", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return null;
    }
  }

  async getNotetypeFields(nid) {
    try {
      const response = await fetch(
        `https://ankiuser.net/edit/getNotetypeFields?ntid=${nid}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return null;
    }
  }

  async parseData(response) {
    //return {deck:'default', model:'basic'};
    const token = /anki\.Editor\('(.*)'/.exec(response)[1];
    //const [models, decks, curModelID] = JSON.parse('[' + /new anki\.EditorAddMode\((.*)\);/.exec(response)[1] + ']');
    const Addinfo = await this.getAddInfo();

    let decknames = [];
    let deckids = {};
    let modelnames = [];
    let modelids = {};
    let modelfieldnames = {};

    for (const deck of Addinfo.decks) {
      decknames.push(deck.name);
      deckids[deck.name] = deck.id;
    }

    for (const notetype of Addinfo.notetypes) {
      modelnames.push(notetype.name);
      modelids[notetype.name] = notetype.id;

      const NotetypeFields = await this.getNotetypeFields(notetype.id);
      let fieldnames = [];
      for (let field of NotetypeFields.fields) {
        fieldnames.push(field.name);
      }
      modelfieldnames[notetype.name] = fieldnames;
    }
    return {
      decknames,
      deckids,
      modelnames,
      modelids,
      modelfieldnames,
      token,
    };
  }

  rewriteHeader(e) {
    const userAgent =
      "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36";

    for (let header of e.requestHeaders) {
      if (header.name.toLowerCase() == "user-agent") {
        header.value = userAgent;
      }
    }
    if (e.method == "POST") {
      let origin = "https://ankiweb.net";
      let referer = "https://ankiweb.net";
      if (e.url == "https://ankiweb.net/account/login") {
        origin = "https://ankiweb.net";
        referer = "https://ankiweb.net/account/login";
      }
      if (e.url == "https://ankiuser.net/edit/save") {
        origin = "https://ankiuser.net";
        referer = "https://ankiuser.net/edit/";
      }
      let hasOrigin = false;
      let hasReferer = false;
      for (let header of e.requestHeaders) {
        if (header.name.toLowerCase() == "origin") {
          header.value = origin;
          hasOrigin = true;
        }
        if (header.name.toLowerCase() == "referer") {
          header.value = referer;
          hasReferer = true;
        }
      }
      if (!hasOrigin)
        e.requestHeaders.push({
          name: "origin",
          value: origin,
        });
      if (!hasReferer)
        e.requestHeaders.push({
          name: "referer",
          value: referer,
        });
    }

    return {
      requestHeaders: e.requestHeaders,
    };
  }
}
