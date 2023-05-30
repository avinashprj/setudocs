const fs = require("fs");
const axios = require("axios");
const glob = require("glob-promise");
const shortid = require("shortid");
const JsSearch = require("js-search");
const _ = require("lodash");
const crypto = require("crypto");
const matter = require("gray-matter");
const config = require("../config/config.json");
const base64url = require("base64url");
require("dotenv").config();
const indexedDocs = [];

// indexes the static docs. Is ran on initial start and the interval in config or default
const indexDocs = async (app) => {
  const docs = await getDocs();
  const index = new JsSearch.Search("_id");
  index.addIndex("docTitle");
  index.addIndex("docBody");
  index.addIndex("docSlug");
  // setup index
  console.log(`[INFO] Found doc count: ${docs.length}`);
  // add to index
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];

    const docSlug = doc.path.slice(0, -4);
    // Check for existing doc
    const existingDoc = _.filter(indexedDocs, {
      sha: await getSha(doc),
      docSlug,
    });
    if (existingDoc && existingDoc.length > 0) {
      return;
    }
    let docBody = await getDoc(doc);
    docBody = base64url.decode(docBody.content);
    const { data: frontMatter, content } = matter(docBody);
    const docTitle = frontMatter.page_title;
    const docId = shortid.generate();
    const indexDoc = {
      docTitle: docTitle,
      docBody: content,
      docSlug,
      sha: await getSha(doc),
      _id: docId,
    };

    // Add to config
    indexedDocs.push(indexDoc);
  }

  // Add all docs to index
  index.addDocuments(indexedDocs);

  // Write back index
  app.index = index;

  // Keep static docs
  app.config.docs = indexedDocs;

  console.log(`[INFO] Docs indexed: ${indexedDocs.length}`);
};

// Sets the github options from the config
const githubOptions = (config) => {
  return {
    url: "https://api.github.com/repos/setuhq/docs/git/trees/8f6db37a2884494b0e5819cb33b7eba4d5c98268?recursive=1",
    headers: {
      authorization: `Bearer ${process.env.PAT}`,
    },
  };
};

const getDocs = async () => {
  const githubOpts = githubOptions(config);

  if (config.static) {
    // Get docs
    return glob("docs/*");
  }

  if (process.env.NODE_ENV === "production") {
    const githubData = await axios.get(githubOpts.url, {
      headers: githubOpts.headers,
    });
    const mdxData = githubData.data.tree.filter((item) => {
      return item.path.slice(-3) === "mdx";
    });

    return mdxData;
  }
  return require("../config/exampleDocs.json");
};

const getDoc = async (doc) => {
  if (config.static) {
    // Get doc
    return fs.readFileSync(doc, "utf-8");
  }

  // Check for existing doc
  const existingDoc = _.filter(indexedDocs, {
    sha: doc.sha,
    docSlug: doc.path.slice(0.0 - 4),
  });
  if (existingDoc && existingDoc.length > 0) {
    return existingDoc.docBody;
  }
  // No existing doc, fetching
  try {
    const fetchedDoc = await axios.get(doc.url, {
      headers: {
        authorization: `Bearer ${process.env.PAT}`,
      },
    });
    return fetchedDoc.data;
  } catch (ex) {
    console.log("[ERROR] Failed to fetch Github doc", ex);
    return "";
  }
};

const getSha = async (doc) => {
  if (config.static) {
    // Get sha of doc
    const shasum = crypto.createHash("sha1");
    const readFile = fs.readFileSync(doc, "utf-8");
    shasum.update(readFile);
    return shasum.digest("hex");
  }

  return doc.sha;
};

module.exports = {
  indexDocs,
};
