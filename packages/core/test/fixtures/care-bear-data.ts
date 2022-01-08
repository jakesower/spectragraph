import { schema } from "./care-bear-schema";
import { NormalizedResources } from "../../src/types";

export const careBearData = {
  bears: {
    1: {
      $type: "bears",
      $id: "1",
      $properties: {
        name: "Tenderheart Bear",
        year_introduced: 1982,
        belly_badge: "red heart with pink outline",
        fur_color: "tan",
      },
      $relationships: {
        best_friend: null,
        home: { $type: "homes", $id: "1" },
        powers: [{ $type: "powers", $id: "careBearStare" }],
      },
    },
    2: {
      $type: "bears",
      $id: "2",
      $properties: {
        name: "Cheer Bear",
        year_introduced: 1982,
        belly_badge: "rainbow",
        fur_color: "carnation pink",
      },
      $relationships: {
        home: { $type: "homes", $id: "1" },
        powers: [{ $type: "powers", $id: "careBearStare" }],
        best_friend: { $type: "bears", $id: "3" },
      },
    },
    3: {
      $type: "bears",
      $id: "3",
      $properties: {
        name: "Wish Bear",
        year_introduced: 1982,
        belly_badge: "shooting star",
        fur_color: "turquoise",
      },
      $relationships: {
        home: { $type: "homes", $id: "1" },
        powers: [{ $type: "powers", $id: "careBearStare" }],
        best_friend: { $type: "bears", $id: "2" },
      },
    },
    5: {
      $type: "bears",
      $id: "5",
      $properties: {
        name: "Smart Heart Bear",
        year_introduced: 2005,
        belly_badge: "red apple with a small white heart-shaped shine",
        fur_color: "watermelon pink",
      },
      $relationships: {
        best_friend: null,
        home: null,
        powers: [{ $type: "powers", $id: "careBearStare" }],
      },
    },
  },
  homes: {
    1: {
      $type: "homes",
      $id: "1",
      $properties: {
        name: "Care-a-Lot",
        location: "Kingdom of Caring",
        caring_meter: 1,
        is_in_clouds: true,
      },
      $relationships: {
        bears: [{ $type: "bears", $id: "1" }, { $type: "bears", $id: "2" }, { $type: "bears", $id: "3" }],
      },
    },
    2: {
      $type: "homes",
      $id: "2",
      $properties: {
        name: "Forest of Feelings",
        location: "Kingdom of Caring",
        caring_meter: 1,
        is_in_clouds: false,
      },
      $relationships: {
        bears: [],
      },
    },
  },
  powers: {
    careBearStare: {
      $type: "powers",
      $id: "careBearStare",
      $properties: {
        name: "Care Bear Stare",
        description: "Purges evil.",
        type: "group power",
      },
      $relationships: {
        bears: [
          { $type: "bears", $id: "1" },
          { $type: "bears", $id: "2" },
          { $type: "bears", $id: "3" },
          { $type: "bears", $id: "5" },
        ],
      },
    },
    makeWish: {
      $type: "powers",
      $id: "makeWish",
      $properties: {
        name: "Make a Wish",
        description: "Makes a wish on Twinkers",
        type: "individual power",
      },
      $relationships: {
        bears: [],
      },
    },
  },
  companions: {},
} as NormalizedResources<typeof schema>;
