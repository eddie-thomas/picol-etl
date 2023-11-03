const {
  DataFactory,
  explicitNamespaces,
  implicitNamespaces,
  StoreExt,
  utils,
  serialize,
  literals,
  deserialize,
} = require("@semantic-arts/rdfjs");
const fs = require("fs");

const DATA = JSON.parse(fs.readFileSync("./all_product_data.json", "utf8"));
const CROP_DATA = deserialize(
  fs.readFileSync("./tmp/crops.trig", "utf8"),
  "TriG"
).toQuads();
const PEST_DATA = deserialize(
  fs.readFileSync("./tmp/pests.trig", "utf8"),
  "TriG"
).toQuads();

const CompanyData = JSON.parse(fs.readFileSync("./CompanyData.json", "utf8"));

const EXPECTED_KEY_NAMES = [
  "Id",
  "Name",
  "WsdaLineNum",
  "OrPid",
  "CurrentlyRegisteredWashington",
  "CurrentlyRegisteredOregon",
  "Epa",
  "EpaOne",
  "EpaTwo",
  "EpaThree",
  "IntendedUser",
  "Ingredients",
  "ResistanceCode",
  "ResistanceSource",
  "Concentrations",
  "PesticideTypes",
  "RegistrantName",
  "Sln",
  "Supplemental",
  "Formulation",
  "SignalWord",
  "Usage",
  "SupplementalName",
  "SupplementalExpiration",
  "SlnName",
  "SlnExpiration",
  "Spanish",
  "Organic",
  "EsaNotice",
  "Section18",
  "Section18Expiration",
  "I502",
  "Essb",
  "WashingtonDownload",
  "OregonDownload",
  "WashingtonRegistrationYear",
  "OregonRegistrationYear",
  "Crops",
  "Pests",
  "Crops_Pests",
];

const ns = {
  picol: implicitNamespaces("https://picol.cahnrs.wsu.edu/"),
  ...implicitNamespaces,
};

const STORE = new StoreExt([]);
const CROP_PEST_STORE = new StoreExt([...CROP_DATA, ...PEST_DATA]);
// function getCompanyTriples() {
//   for (const [key, value] of Object.entries(CompanyData)) {
//     const subjectTerms = STORE.getSubjects(
//       explicitNamespaces.skos.prefLabel,
//       literals.make.xsd.string(key)
//     );
//     if (subjectTerms.length === 0) {
//       console.log(`\n\n${key}, ${value}\n`);
//       throw new Error("No company data present!");
//     }
//     if (subjectTerms.length > 1)
//       throw new Error("Duplicate company data present!");
//     const subjectTerm = subjectTerms.pop();
//     STORE.addQuad(
//       DataFactory.quad(
//         subjectTerm,
//         ns.gist.hasCommunicationAddress,
//         DataFactory.literal(value, explicitNamespaces.xsd.anyURI)
//       )
//     );
//   }
// }

function getDefaultTriples() {
  const data = {
    IntendedUser: ["COMMERCIAL", "HOME"],
    SignalWord: [
      "WARNING",
      "DANGER/POISON",
      "CAUTION",
      "NO SIGNAL WORD GIVEN",
      "DANGER",
    ],
    UsageType: [
      "SRUP-STRYCHNINE (WA ONLY)",
      "FEDERALLY RESTRICTED USE",
      "GENERAL USE",
      "SRUP-CLOPYRALID & PHENOXY (WA ONLY)",
      "SRUP-GROUND WATER & PHENOXY (WA ONLY)",
      "SRUP-AQUATIC & PHENOXY (WA ONLY)",
      "SRUP-CLOPYRALID USE (WA ONLY)",
      "SRUP-GROUND WATER (WA ONLY)",
      "SRUP-PHENOXY USE (WA ONLY)",
      "25B-EXEMPT FROM EPA REG.",
      "SRUP-AQUATIC USE (WA ONLY)",
    ],

    PesticideType: [
      "HERBICIDE",
      "PGR - FRUIT DROP",
      "PGR - GROWTH RETARDANT",
      "SYNERGIST",
      "PGR - CROP QUALITY",
      "PGR - GROWTH STIMULATOR",
      "DISINFECTANT",
      "FUNGICIDE",
      "MICROBIAL INHIBITOR",
      "PHEROMONE",
      "INSECTICIDE",
      "NEMATICIDE",
      "DESICCANT",
      "INSECT REPELLENT",
      "INVERTEBRATE CONTROL",
      "ADJC-COMPATIBILITY AGENT",
      "ADJS-SURFACTANT",
      "PGR - CROP MATURATION",
      "PGR - GENERAL",
      "ADJE-EXTENDER / STICKER",
      "VERTEBRATE REPELLENT",
      "ADJB-BUFFER / ACIDIFIER",
      "ADJD-DRIFT CTRL / DEP AID",
      "ADJF-ANTIFOAMING AGENT",
      "ADJU-OTHER",
      "ALGAECIDE SLIMICIDE",
      "VERTEBRATE CONTROL",
      "RODENTICIDE",
      "ADJA-AMMON.SULFATE / WATER COND",
      "PLANT INCORPORATED PROTECTANT",
    ],
  };

  for (const [key, value] of Object.entries(data)) {
    value.map((label, i) => {
      const subjectTerm =
        ns.picol[
          `_${key
            .replace(/\s+|\/|-|\.|,|\&|\[|\]/g, "_")
            .replace(/__+/g, "_")}_${i}`
        ];
      STORE.addQuads([
        DataFactory.quad(
          subjectTerm,
          explicitNamespaces.rdf.type,
          ns.picol[key]
        ),
        DataFactory.quad(
          subjectTerm,
          explicitNamespaces.skos.prefLabel,
          literals.make.xsd.string(label)
        ),
      ]);
    });
  }
}

function getIngredientAndConcentrations(subject, label) {
  const ingredients = label.Ingredients.split(";");
  const concentrations = label.Concentrations.split(";");
  const results = ingredients.map((ingredient, i) => {
    const concentration = concentrations[i];
    const bnode = DataFactory.blankNode();

    return [
      DataFactory.quad(subject, ns.picol.hasIngredientWithConcentration, bnode),
      DataFactory.quad(
        bnode,
        explicitNamespaces.rdf.type,
        ns.picol.IngredientAndConcentrationCompound
      ),
      DataFactory.quad(
        bnode,
        ns.picol.hasIngredient,
        literals.make.xsd.string(ingredient)
      ),
      DataFactory.quad(
        bnode,
        ns.picol.hasConcentration,
        literals.make.xsd.string(concentration || "-1%")
      ),
    ];
  });
  return results.flat();
}

function getCropPest(value, type) {
  const cropOrPestSubjectTerm = CROP_PEST_STORE.getSubjectsMatchingAllPO(
    [explicitNamespaces.skos.prefLabel, DataFactory.literal(value)],
    [explicitNamespaces.rdf.type, ns.picol[type]]
  );
  if (cropOrPestSubjectTerm.length !== 1)
    throw new Error(`Did not find unique subject for value: ${value}|${type}.`);

  return cropOrPestSubjectTerm.pop();
}

/**
 * @param {any} label
 * @param {import("@semantic-arts/rdfjs/types/types").NamedNode} type
 * @return {import("@semantic-arts/rdfjs/types/types").NamedNode}
 */
function findOrMakeByType(value, type) {
  const terms = STORE.getSubjects(
    explicitNamespaces.skos.prefLabel,
    literals.make.xsd.string(value),
    null
  );
  if (terms.length === 0) {
    // Create new thing
    const subjectTerm =
      ns.picol[
        `_${type.value.split("/").pop()}_${value
          .replace(/\s+|\/|-|\.|,|\&|\[|\]/g, "_")
          .replace(/__+/g, "_")}`
      ];
    STORE.addQuads([
      DataFactory.quad(subjectTerm, explicitNamespaces.rdf.type, type),
      DataFactory.quad(
        subjectTerm,
        explicitNamespaces.skos.prefLabel,
        literals.make.xsd.string(value)
      ),
    ]);
    return subjectTerm;
  } else if (terms.length === 1) {
    return terms.pop();
  } else {
    throw new Error(
      `Somehow got too many instances when finding or making. Something was made twice! See: ${JSON.stringify(
        terms.pop(),
        null,
        4
      )}`
    );
  }
}

/**
 *
 * @param {object} label
 */
function turnLabelIntoTriples(label) {
  const labelKeys = Object.keys(label);
  if (EXPECTED_KEY_NAMES.sort().toString() !== labelKeys.sort().toString())
    throw new Error("Mismatched keys!");

  const subjectTerm = ns.picol[`_product_${label.Id}`];

  STORE.addQuads([
    // Type
    DataFactory.quad(subjectTerm, ns.rdf.type, ns.gist.ProductUnit),
    // Id
    DataFactory.quad(
      subjectTerm,
      ns.gist.isIdentifiedBy,
      literals.make.xsd.integer(label.Id)
    ),
    // Name
    DataFactory.quad(
      subjectTerm,
      explicitNamespaces.skos.prefLabel,
      literals.make.xsd.string(label.Name)
    ),
    // WsdaLineNum
    // OrPid
    // CurrentlyRegisteredWashington
    // CurrentlyRegisteredOregon
    // Epa
    // EpaOne
    // EpaTwo
    // EpaThree
    // IntendedUser
    DataFactory.quad(
      subjectTerm,
      ns.gist.isCategorizedBy,
      findOrMakeByType(label.IntendedUser, ns.picol.IntendedUser)
    ),
    // Ingredients && Concentrations
    ...getIngredientAndConcentrations(subjectTerm, label),
    // ResistanceCode
    // ResistanceSource
    // Concentrations - See the above ingredients
    // ...label.Concentrations.split(";").map((con) =>
    //   DataFactory.quad(
    //     subjectTerm,
    //     ns.picol.hasConcentrations,
    //     DataFactory.integer(label.Name)
    //   )
    // ),
    // PesticideTypes
    ...label.PesticideTypes.split(";").map((type) =>
      DataFactory.quad(
        subjectTerm,
        ns.gist.isCategorizedBy,
        findOrMakeByType(type, ns.picol.PesticideType)
      )
    ),
    // RegistrantName
    DataFactory.quad(
      subjectTerm,
      ns.picol.hasOrganization,
      findOrMakeByType(
        label.RegistrantName,
        explicitNamespaces.gist.Organization
      )
    ),
    DataFactory.quad(
      findOrMakeByType(
        label.RegistrantName,
        explicitNamespaces.gist.Organization
      ),
      ns.gist.hasCommunicationAddress,
      DataFactory.literal(
        CompanyData[label.RegistrantName] || "",
        explicitNamespaces.xsd.anyURI
      )
    ),
    // Sln
    // Supplemental
    // Formulation
    // SignalWord
    DataFactory.quad(
      subjectTerm,
      ns.gist.isCategorizedBy,
      findOrMakeByType(label.SignalWord, ns.picol.SignalWord)
    ),
    // Usage
    DataFactory.quad(
      subjectTerm,
      ns.gist.isCategorizedBy,
      findOrMakeByType(label.Usage, ns.picol.UsageType)
    ),
    // SupplementalName
    // SupplementalExpiration
    // SlnName
    // SlnExpiration
    // Spanish
    // Organic
    // EsaNotice
    // Section18
    // Section18Expiration
    // I502
    // Essb
    // WashingtonDownload
    // OregonDownload
    // WashingtonRegistrationYear
    // OregonRegistrationYear

    // Crops
    ...label.Crops.map((crop) =>
      DataFactory.quad(subjectTerm, ns.picol.hasCrop, getCropPest(crop, "Crop"))
    ),
    // Pests
    ...label.Pests.map((pest) =>
      DataFactory.quad(subjectTerm, ns.picol.hasPest, getCropPest(pest, "Pest"))
    ),
  ]);
}

// function getCropAndPestCombinations({ Id, Crops_Pests }, CropAndPestStore) {
//   const subjectTerm = ns.picol[`_product_${Id}`];

//   // Crops_Pests
//   Crops_Pests.forEach((cropAndPest) => {
//     const [crop, pest] = cropAndPest.split(" - ");
//     const bnode = DataFactory.blankNode();
//     const quads = [
//       DataFactory.quad(subjectTerm, ns.picol.hasCropAndPest, bnode),
//       DataFactory.quad(
//         bnode,
//         explicitNamespaces.rdf.type,
//         ns.picol.CropAndPest
//       ),
//       DataFactory.quad(
//         bnode,
//         ns.picol.hasPest,
//         findOrMakeByType(pest, ns.picol.Pest)
//       ),
//       DataFactory.quad(
//         bnode,
//         ns.picol.hasCrop,
//         findOrMakeByType(crop, ns.picol.Crop)
//       ),
//     ];
//     CropAndPestStore.addQuads(quads);
//   });
// }

function execute() {
  getDefaultTriples();
  DATA.Labels.forEach((labelObject) => turnLabelIntoTriples(labelObject));

  const quads = STORE.getQuads();
  const graphedQuads = utils.withGraph(quads, ns.picol.InitialPICOLData);
  fs.writeFileSync(
    `./tmp/_instance_data.trig`,
    serialize(graphedQuads).toString("TriG", {
      gist: ns.gist[""],
      picol: ns.picol[""],
      xsd: ns.xsd[""],
    })
  );
}

execute();

// {
//     "Id": 1,
//     "Name": "VITAL-OXIDE [1",
//     "WsdaLineNum": "1",
//     "OrPid": "None",
//     "CurrentlyRegisteredWashington": true,
//     "CurrentlyRegisteredOregon": true,
//     "Epa": "82972-1",
//     "EpaOne": "82972",
//     "EpaTwo": "1",
//     "EpaThree": null,
//     "IntendedUser": "HOME",
//     "Ingredients": "ALKYL (60%C14,30%C16,5%C18,5%C12) DBAC;ALKYL (68%C12,32%C14) DBAC;CHLORINE DIOXIDE",
//     "ResistanceCode": "",
//     "ResistanceSource": "",
//     "Concentrations": "0.125%;0.125%;0.200%",
//     "PesticideTypes": "DISINFECTANT",
//     "RegistrantName": "VITAL SOLUTIONS LLC",
//     "Sln": null,
//     "Supplemental": null,
//     "Formulation": "LIQUID",
//     "SignalWord": "NO SIGNAL WORD GIVEN",
//     "Usage": "GENERAL USE",
//     "SupplementalName": "",
//     "SupplementalExpiration": null,
//     "SlnName": null,
//     "SlnExpiration": null,
//     "Spanish": false,
//     "Organic": false,
//     "EsaNotice": false,
//     "Section18": null,
//     "Section18Expiration": null,
//     "I502": false,
//     "Essb": false,
//     "WashingtonDownload": "http://cru66.cahe.wsu.edu/~picol/pdf/WA/49304.pdf",
//     "OregonDownload": "http://cru66.cahe.wsu.edu/~picol/pdf/OR/49304.pdf",
//     "WashingtonRegistrationYear": "2024",
//     "OregonRegistrationYear": "2023"
//   },
