// Site photos for six faces, from Wikimedia Commons (licence read from each file page's metadata on 30 Oct 2026).
// They are ILLUSTRATIVE: Commons has almost no photographs of billboards at these exact Atlanta sites, so each photo shows a similar
// US roadside billboard, bus shelter or street scene, and photoCredit says so. Files live in R2 (WS_BLOB, key photos/<face id>.jpg) and are
// served by GET /api/faces/:id/photo, an absolute URL so the vision step (which fetches from inside the Worker) can reach it.
// CC BY-SA needs credit and share-alike: the credit string carries author, licence and the Commons page.
const BASE = "https://wallspace.pages.dev";

export const PHOTOS: Record<string, { photoUrl: string; photoCredit: string; r2Key: string }> = {
  "ATL-0101": { photoUrl: `${BASE}/api/faces/ATL-0101/photo`, photoCredit: "Illustrative photo, not this exact site (billboard partly hidden by a tree and utility pole, Snellville). Jober14 at en.wikipedia, Public domain, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:GA_124_Snellville_north.JPG", r2Key: "photos/ATL-0101.jpg" },
  "ATL-0116": { photoUrl: `${BASE}/api/faces/ATL-0116/photo`, photoCredit: "Illustrative photo, not this exact site (clear sightline, billboard on I-285 near Decatur). Michael Rivera, CC BY-SA 4.0, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Georgia_I285nb_Exit_39B_exit_only.jpg", r2Key: "photos/ATL-0116.jpg" },
  "ATL-0108": { photoUrl: `${BASE}/api/faces/ATL-0108/photo`, photoCredit: "Illustrative photo, not this exact site (clear sightline, roadside billboard, Georgia). Michael Rivera, CC BY-SA 4.0, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Georgia_I75nb_exit_187.jpg", r2Key: "photos/ATL-0108.jpg" },
  "ATL-0110": { photoUrl: `${BASE}/api/faces/ATL-0110/photo`, photoCredit: "Illustrative photo, not this exact site (billboards behind a pole and trees, Georgia). Dougtone, CC BY-SA 2.0, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:US_Highway_1_-_Georgia_-_8574004052.jpg", r2Key: "photos/ATL-0110.jpg" },
  "ATL-0103": { photoUrl: `${BASE}/api/faces/ATL-0103/photo`, photoCredit: "Illustrative photo, not this exact site (bus shelter ad panel, New York (illustrative)). Tdorante10, CC BY-SA 4.0, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Woodhaven_Bl_Jamaica_Av_04.jpg", r2Key: "photos/ATL-0103.jpg" },
  "ATL-0104": { photoUrl: `${BASE}/api/faces/ATL-0104/photo`, photoCredit: "Illustrative photo, not this exact site (Euclid Avenue, Little Five Points: poles, trees, blade signs). Marc Merlin, CC BY-SA 4.0, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Little_Five_Points_street_scene_looking_along_the_west_side_of_Euclid_Avenue.jpg", r2Key: "photos/ATL-0104.jpg" },
};
