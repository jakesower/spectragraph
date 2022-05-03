export const soccerResourceSchema = {
  resources: {
    match: {
      properties: {
        startTime: { type: "number" },
        endTime: { type: "number" },
        homeGoals: { type: "number" },
        awayGoals: { type: "number" },
        homeTeam: {
          type: "relationship",
          relatedType: "team",
          inverse: "homeMatches",
          cardinality: "one",
        },
        awayTeam: {
          type: "relationship",
          relatedType: "team",
          inverse: "awayMatches",
          cardinality: "one",
        },
        playerParticipations: {
          type: "relationship",
          relatedType: "playerParticipation",
          inverse: "match",
          cardinality: "many",
        },
        officiations: {
          type: "relationship",
          relatedType: "officiation",
          inverse: "match",
          cardinality: "many",
        },
      },
    },
    person: {
      properties: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        dateOfBirth: { type: "string" },
        officiations: {
          type: "relationship",
          relatedType: "officiation",
          inverse: "official",
          cardinality: "many",
        },
        playerParticipations: {
          type: "relationship",
          relatedType: "playerParticipation",
          inverse: "player",
          cardinality: "many",
        },
      },
    },
    playerParticipation: {
      properties: {
        goals: { type: "number" },
        minutes: { type: "number" },
        saves: { type: "number" },
        match: {
          type: "relationship",
          relatedType: "match",
          inverse: "playerParticipations",
          cardinality: "one",
        },
        player: {
          type: "relationship",
          relatedType: "person",
          inverse: "playerParticipations",
          cardinality: "one",
        },
      },
    },
    officiation: {
      properties: {
        position: {
          type: "string",
          enum: ["referee", "ar1", "ar2", "fourth", "reserve ar"],
        },
        match: {
          type: "relationship",
          relatedType: "match",
          inverse: "officiations",
          cardinality: "one",
        },
        official: {
          type: "relationship",
          relatedType: "person",
          inverse: "officiations",
          cardinality: "one",
        },
      },
    },
    team: {
      properties: {
        name: { type: "string" },
        homeMatches: {
          type: "relationship",
          relatedType: "match",
          inverse: "homeTeam",
          cardinality: "many",
        },
        awayMatches: {
          type: "relationship",
          relatedType: "match",
          inverse: "awayTeam",
          cardinality: "many",
        },
      },
    },
  },
};

export const soccerResourceData = {
  match: {
    1: {
      homeTeam: { type: "team", id: "arizonaBay" },
      awayTeam: { type: "team", id: "tempe" },
    },
  },
  person: {},
  officiation: {},
  team: {
    arizonaBay: {
      name: "Arizona Bay FC",
      homeMatches: [{ type: "match", id: 1 }],
      awayMatches: [],
    },
    glendale: {
      name: "Glendale Guppies SC",
      homeMatches: [],
      awayMatches: [],
    },
    phoenix: {
      name: "Phoenix Hurricanes",
      homeMatches: [],
      awayMatches: [],
    },
    scottsdale: {
      name: "Scottsdale Stingrays",
      homeMatches: [],
      awayMatches: [],
    },
    tempe: {
      name: "Tempe Surf",
      homeMatches: [],
      awayMatches: [{ type: "match", id: 1 }],
    },
    tucson: {
      name: "Tucson Tritons FC",
      homeMatches: [],
      awayMatches: [],
    },
  },
};
