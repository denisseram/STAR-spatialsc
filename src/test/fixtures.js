/**
 * Small, self-contained figure fixtures for component/unit tests.
 * fig1 is from an interactive paper; fig3 is hidden-by-default (benchmarking).
 */
export const testFigures = [
  {
    guid: "f1",
    name: "Fig1",
    sourceGuid: "src1",
    sourceName: "Smith-2021.pdf",
    codes: ["subset.interactivity", "Data.Modality.MERFISH", "What genes are spatially variable?"],
    imagePath: "/img1.png",
    citation: "Smith A. et al. - 2021",
    paperTitle: "Paper One: Spatial Gene Expression",
    paperUrl: "https://example.com/paper1",
    year: "2021"
  },
  {
    guid: "f2",
    name: "Fig2",
    sourceGuid: "src2",
    sourceName: "Jones B - 2019 - Cell clustering.pdf",
    codes: ["Data.Modality.Visium", "Task.Analysis.Clustering", "How do cell types cluster spatially?"],
    imagePath: "/img2.png",
    citation: null,
    paperTitle: "Paper Two: Cluster Analysis",
    paperUrl: null,
    year: "2019"
  },
  {
    guid: "f3",
    name: "Fig3",
    sourceGuid: "src3",
    sourceName: "X-2022.pdf",
    codes: ["Other.Benchmarking / Method evaluation", "How accurate is the new method?"],
    imagePath: "/img3.png",
    citation: "2022",
    paperTitle: "Paper Three: Benchmarking Study",
    paperUrl: "https://example.com/paper3",
    year: "2022"
  }
];
