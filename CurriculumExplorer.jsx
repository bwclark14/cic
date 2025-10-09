import React, { useEffect, useMemo, useState } from "react";

/*
Curriculum Explorer (Single-file React component)
- Demo-friendly, JSON-backed (embedded sample JSON for the demo but easily swapped to fetch('/data/curriculum.json'))
- No authentication
- Views:
  - Progression by Concept (concept -> subjects -> levels)
  - All Concepts by Level (show each level and every concept across subjects)
  - All Concepts by Subject (subject-focused view)
- UI: Tailwind-ready classes (assumes Tailwind is configured in the host app)

How to use in a project:
1. Ensure Tailwind CSS is installed and configured.
2. Drop this file into your React project (e.g., src/components/CurriculumExplorer.jsx).
3. (Optional) Move the `sampleData` to a JSON file and fetch it instead of using the embedded data.

*/

// ----------------------- Sample Curriculum JSON -----------------------
const sampleData = {
  "Social Subjects": {
    bigIdeas: [
      {
        name: "Human Societies",
        concepts: [
          {
            name: "Cultural Diversity",
            description: "How communities form identity and adapt.",
            subjects: {
              Geography: {
                levels: {
                  1: { know: "Identify local cultural features.", do: "Describe local traditions and landmarks." },
                  2: { know: "Explain how geography shapes culture.", do: "Compare cultural traits across two regions." },
                  3: { know: "Analyse human-environment interactions.", do: "Investigate cultural change using maps and data." },
                  4: { know: "Assess globalisation's effect on cultures.", do: "Propose strategies for cultural sustainability." }
                }
              },
              History: {
                levels: {
                  1: { know: "Recognise historical traditions in the community.", do: "Retell a local story or event." },
                  2: { know: "Describe how traditions developed.", do: "Sequence events that shaped local identity." },
                  3: { know: "Analyse causes of cultural change.", do: "Use primary sources to interpret past cultures." },
                  4: { know: "Evaluate differing historical interpretations.", do: "Construct an evidence-based argument about continuity/change." }
                }
              },
              "Modern Studies": {
                levels: {
                  1: { know: "Identify community groups and roles.", do: "Describe who does what in your area." },
                  2: { know: "Explain how society is organised.", do: "Present findings about a social issue." },
                  3: { know: "Investigate social issues and institutions.", do: "Use evidence to support claims about a policy." },
                  4: { know: "Evaluate political responses to diversity.", do: "Debate policy options with supporting evidence." }
                }
              }
            }
          },
          {
            name: "Governance and Citizenship",
            description: "Understanding systems that organise societies.",
            subjects: {
              Geography: {
                levels: {
                  1: { know: "Recognise local authorities.", do: "Map where decisions are made locally." },
                  2: { know: "Explain basics of governance structures.", do: "Compare simple governance models." },
                  3: { know: "Analyse how governance affects people.", do: "Investigate a local policy impact." },
                  4: { know: "Critique democratic processes.", do: "Propose improvements to citizen engagement." }
                }
              },
              History: {
                levels: {
                  1: { know: "Identify key historical leaders.", do: "Retell a leader's role in community history." },
                  2: { know: "Describe how institutions evolved.", do: "Sequence institutional development." },
                  3: { know: "Analyse power and resistance in history.", do: "Interpret documents showing contested power." },
                  4: { know: "Assess long-term political change.", do: "Write a balanced historical evaluation." }
                }
              },
              "Modern Studies": {
                levels: {
                  1: { know: "Recognise voting and simple civic duties.", do: "Participate in a mock vote." },
                  2: { know: "Explain local and national decision-making.", do: "Research how a law is made." },
                  3: { know: "Investigate public opinion and policy.", do: "Design and analyse a short survey." },
                  4: { know: "Evaluate political arguments critically.", do: "Write a policy brief with recommendations." }
                }
              }
            }
          }
        ]
      }
    ]
  },

  "Expressive Arts": {
    bigIdeas: [
      {
        name: "Creativity and Expression",
        concepts: [
          {
            name: "Artistic Communication",
            description: "Using media and performance to communicate ideas.",
            subjects: {
              Art: {
                levels: {
                  1: { know: "Primary colours and simple tools.", do: "Create simple observational drawings." },
                  2: { know: "Texture, pattern and simple composition.", do: "Experiment with mixed media." },
                  3: { know: "Composition and techniques across media.", do: "Develop original artworks with intent." },
                  4: { know: "Critical reflection on art practice.", do: "Curate and present a themed portfolio." }
                }
              },
              Music: {
                levels: {
                  1: { know: "Basic rhythm and pitch.", do: "Perform short simple songs and rhythms." },
                  2: { know: "Introduction to notation and structure.", do: "Compose a short melody." },
                  3: { know: "Harmony, form and arrangement.", do: "Arrange a piece for a small ensemble." },
                  4: { know: "Analysing musical works and production.", do: "Compose and record a complete piece." }
                }
              },
              Drama: {
                levels: {
                  1: { know: "Role-play and imagination.", do: "Act simple scripted or improvised scenes." },
                  2: { know: "Basic drama techniques (voice, movement).", do: "Develop and sustain a character." },
                  3: { know: "Script work and staging.", do: "Direct or perform a structured scene." },
                  4: { know: "Production processes and critique.", do: "Produce a short performance event." }
                }
              }
            }
          },
          {
            name: "Responding and Reflecting",
            description: "Understanding and evaluating creative work.",
            subjects: {
              Art: {
                levels: {
                  1: { know: "Recognise feelings in artworks.", do: "Describe what an artwork makes you feel." },
                  2: { know: "Discuss basic artistic choices.", do: "Compare two simple artworks." },
                  3: { know: "Use appropriate vocabulary to critique.", do: "Write a short critique with evidence." },
                  4: { know: "Situate work in wider cultural contexts.", do: "Lead a group critique and reflection session." }
                }
              },
              Music: {
                levels: {
                  1: { know: "Identify mood in music.", do: "Describe how tempo or dynamics affect mood." },
                  2: { know: "Explain simple musical choices.", do: "Compare two musical excerpts." },
                  3: { know: "Analyse form and expression.", do: "Write a short analytical response." },
                  4: { know: "Evaluate musical works across contexts.", do: "Lead a seminar on comparative listening." }
                }
              },
              Drama: {
                levels: {
                  1: { know: "Recognise simple dramatic elements.", do: "Describe a character's feelings." },
                  2: { know: "Discuss staging choices.", do: "Give feedback to a peer performance." },
                  3: { know: "Analyse themes and performance choices.", do: "Write a review with examples." },
                  4: { know: "Critique production choices and audience impact.", do: "Produce a reflective evaluation of a full production." }
                }
              }
            }
          }
        ]
      }
    ]
  }
};

// ----------------------- Utility helpers -----------------------
function gatherAllConcepts(data) {
  const concepts = [];
  Object.entries(data).forEach(([areaName, area]) => {
    area.bigIdeas.forEach((bigIdea) => {
      bigIdea.concepts.forEach((concept) => {
        concepts.push({ area: areaName, bigIdea: bigIdea.name, ...concept });
      });
    });
  });
  return concepts;
}

function getSubjectsForArea(area) {
  const subjects = new Set();
  area.bigIdeas.forEach((bi) => {
    bi.concepts.forEach((c) => Object.keys(c.subjects).forEach((s) => subjects.add(s)));
  });
  return Array.from(subjects);
}

// ----------------------- Main Component -----------------------
export default function CurriculumExplorer() {
  const [data, setData] = useState(sampleData);
  const [selectedArea, setSelectedArea] = useState(Object.keys(sampleData)[0]);
  const [view, setView] = useState("progression"); // progression | level | subject
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    // In a real demo you might fetch('/data/curriculum.json').then(r => r.json()).then(setData)
    setSelectedArea(Object.keys(data)[0]);
  }, []);

  const area = data[selectedArea];
  const allConcepts = useMemo(() => gatherAllConcepts(data), [data]);

  // Filtered concepts for search and optional subject filter
  const filteredConcepts = useMemo(() => {
    return allConcepts.filter((c) => {
      if (c.area !== selectedArea) return false;
      const matchSearch = search.trim() === "" || (
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase()?.includes(search.toLowerCase()) ||
        c.bigIdea.toLowerCase().includes(search.toLowerCase())
      );
      if (!matchSearch) return false;
      if (!selectedSubject) return true;
      return Object.keys(c.subjects).includes(selectedSubject);
    });
  }, [allConcepts, selectedArea, search, selectedSubject]);

  // All subjects in current area
  const subjects = area ? getSubjectsForArea(area) : [];

  // ----- Render helpers -----
  function renderProgressionView() {
    return (
      <div className="space-y-6">
        {area.bigIdeas.map((bi) => (
          <div key={bi.name} className="bg-white shadow-sm rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Big Idea: {bi.name}</h3>
              <div className="text-sm text-gray-500">Concepts: {bi.concepts.length}</div>
            </div>

            <div className="mt-3 grid gap-4">
              {bi.concepts.map((concept) => (
                <div key={concept.name} className="border rounded-md p-3 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{concept.name}</h4>
                      {concept.description && <div className="text-sm text-gray-600">{concept.description}</div>}
                    </div>
                    <div className="text-sm text-gray-500">Subjects: {Object.keys(concept.subjects).join(", ")}</div>
                  </div>

                  <div className="mt-3 grid md:grid-cols-3 gap-3">
                    {Object.entries(concept.subjects).map(([subName, subData]) => (
                      <div key={subName} className="bg-white rounded p-2 shadow-inner">
                        <div className="font-semibold mb-1">{subName}</div>
                        <ul className="text-sm space-y-1">
                          {Object.entries(subData.levels).map(([lvl, kd]) => (
                            <li key={lvl}><span className="font-medium">Level {lvl}:</span> <span className="italic">Know</span> - {kd.know} <br/><span className="italic">Do</span> - {kd.do}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderLevelView() {
    // Build a map: level -> array of {concept, subject, bigIdea}
    const levels = { 1: [], 2: [], 3: [], 4: [] };
    filteredConcepts.forEach((c) => {
      Object.entries(c.subjects).forEach(([sub, sd]) => {
        Object.entries(sd.levels).forEach(([lvl, kd]) => {
          levels[lvl].push({ concept: c.name, subject: sub, bigIdea: c.bigIdea, know: kd.know, do: kd.do });
        });
      });
    });

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(levels).map(([lvl, items]) => (
          <div key={lvl} className="bg-white rounded-lg shadow p-4">
            <h4 className="text-lg font-semibold mb-2">Level {lvl} <span className="text-sm text-gray-500">({items.length} items)</span></h4>
            <div className="space-y-2 max-h-80 overflow-auto">
              {items.map((it, i) => (
                <div key={i} className="p-2 border rounded">
                  <div className="flex justify-between text-sm text-gray-700">
                    <div>
                      <div className="font-medium">{it.concept} <span className="text-xs text-gray-500">— {it.subject}</span></div>
                      <div className="text-xs text-gray-600">Big Idea: {it.bigIdea}</div>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-800"><span className="italic">Know:</span> {it.know}</div>
                  <div className="text-xs text-gray-800"><span className="italic">Do:</span> {it.do}</div>
                </div>
              ))}
              {items.length === 0 && <div className="text-sm text-gray-500">No items found for this level with current filters.</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderSubjectView() {
    // Show each subject and its concepts
    const subjectItems = {};
    filteredConcepts.forEach((c) => {
      Object.entries(c.subjects).forEach(([sub, sd]) => {
        if (!subjectItems[sub]) subjectItems[sub] = [];
        subjectItems[sub].push({ concept: c.name, bigIdea: c.bigIdea, levels: sd.levels });
      });
    });

    const subjectKeys = Object.keys(subjectItems);
    return (
      <div className="space-y-4">
        {subjectKeys.length === 0 && <div className="text-sm text-gray-500">No concepts match your filters.</div>}
        {subjectKeys.map((sub) => (
          <div key={sub} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">{sub}</h4>
              <div className="text-sm text-gray-500">Concepts: {subjectItems[sub].length}</div>
            </div>
            <div className="mt-3 grid gap-3">
              {subjectItems[sub].map((it) => (
                <div key={it.concept} className="border rounded p-3 bg-gray-50">
                  <div className="font-medium">{it.concept} <span className="text-xs text-gray-500">— {it.bigIdea}</span></div>
                  <ul className="mt-2 text-sm space-y-1">
                    {Object.entries(it.levels).map(([lvl, kd]) => (
                      <li key={lvl}><span className="font-medium">Level {lvl}:</span> <span className="italic">Know</span> - {kd.know} <br/><span className="italic">Do</span> - {kd.do}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "curriculum-demo.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ----------------------- Layout -----------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Curriculum Explorer</h1>
            <p className="text-sm text-gray-600">Browse progression by concept, by level, or by subject. Demo-ready with JSON backing.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
              <label className="text-sm text-gray-600">Area</label>
              <select
                value={selectedArea}
                onChange={(e) => { setSelectedArea(e.target.value); setSelectedSubject(null); }}
                className="ml-2 text-sm"
              >
                {Object.keys(data).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
              <label className="text-sm text-gray-600">View</label>
              <div className="flex gap-1">
                <button onClick={() => setView("progression")} className={`px-3 py-1 rounded text-sm ${view === "progression" ? "bg-indigo-600 text-white" : "text-gray-700"}`}>Progression</button>
                <button onClick={() => setView("level")} className={`px-3 py-1 rounded text-sm ${view === "level" ? "bg-indigo-600 text-white" : "text-gray-700"}`}>By Level</button>
                <button onClick={() => setView("subject")} className={`px-3 py-1 rounded text-sm ${view === "subject" ? "bg-indigo-600 text-white" : "text-gray-700"}`}>By Subject</button>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search concepts or big ideas" className="text-sm outline-none" />
              <button onClick={() => { setSearch(""); setSelectedSubject(null); }} className="text-xs text-gray-500">Clear</button>
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm">
              <label className="text-sm text-gray-600">Subject</label>
              <select value={selectedSubject || ""} onChange={(e) => setSelectedSubject(e.target.value || null)} className="text-sm">
                <option value="">All</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <button onClick={exportJSON} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Export JSON</button>
            </div>
          </div>
        </header>

        <main>
          {view === "progression" && renderProgressionView()}
          {view === "level" && renderLevelView()}
          {view === "subject" && renderSubjectView()}
        </main>

        <footer className="mt-8 text-sm text-gray-500">Demo data included. To use your own JSON, replace <code className="bg-gray-100 px-1 rounded">sampleData</code> with a fetch to your file.</footer>
      </div>
    </div>
  );
}
