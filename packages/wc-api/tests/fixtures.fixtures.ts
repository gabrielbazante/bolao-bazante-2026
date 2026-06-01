export const RAW_FT = {
  fixture: { id: 1208000, date: "2026-06-11T20:00:00+00:00",
    status: { short: "FT", long: "Match Finished" } },
  teams: {
    home: { id: 6, name: "Mexico" }, away: { id: 1118, name: "Brazil" },
  },
  goals: { home: 1, away: 2 },
  score: {
    halftime: { home: 0, away: 1 },
    fulltime: { home: 1, away: 2 },
    extratime: { home: null, away: null },
    penalty:   { home: null, away: null },
  },
};

export const RAW_AET = {
  ...RAW_FT,
  fixture: { ...RAW_FT.fixture, status: { short: "AET", long: "After Extra Time" } },
  score: {
    halftime: { home: 1, away: 0 },
    fulltime: { home: 1, away: 1 },
    extratime: { home: 2, away: 1 },
    penalty:   { home: null, away: null },
  },
};

export const RAW_LIVE = {
  ...RAW_FT,
  fixture: { ...RAW_FT.fixture, status: { short: "1H", long: "First Half" } },
  score: {
    halftime: { home: null, away: null },
    fulltime: { home: null, away: null },
    extratime: { home: null, away: null },
    penalty:   { home: null, away: null },
  },
};
