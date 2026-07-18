'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { 
  GitBranch, Trash2, Edit, Plus, ArrowRightLeft, GitFork, 
  Info, Home, LogOut, Calendar, UserPlus, X, AlertTriangle,
  Network, Users, ChevronLeft, ChevronRight, Check, MapPin,
  Search, Filter, SlidersHorizontal, RefreshCw, AlertCircle, Sparkles
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../ThemeToggle";
import styles from "./dashboard.module.css";

import nextDynamic from "next/dynamic";

const FamilyTreeFlow = nextDynamic(
  () => import("./FamilyTreeFlow"),
  { ssr: false, loading: () => <div className={styles.emptyState}>Loading family tree visualization...</div> }
);

// ------------------------------------------------------------------------------
// GraphQL Queries & Mutations
// ------------------------------------------------------------------------------

const GET_ALL_DATA = gql`
  query GetAllData {
    people {
      id
      firstName
      lastName
      nickname
      gender
      birthDate
      estimatedBirthYear
      deathDate
      birthPlace
      photoUrl
      notes
      isUnknown
      isLiving
    }
    relationships {
      id
      type
      sourcePersonId
      targetPersonId
      parentChildType
      partnerType
      startDate
      startYear
      endDate
      endYear
    }
  }
`;

const CREATE_PERSON = gql`
  mutation CreatePerson($input: CreatePersonInput!) {
    createPerson(input: $input) {
      id
      firstName
      lastName
    }
  }
`;

const UPDATE_PERSON = gql`
  mutation UpdatePerson($id: UUID!, $input: UpdatePersonInput!) {
    updatePerson(id: $id, input: $input) {
      id
      firstName
      lastName
    }
  }
`;

const DELETE_PERSON = gql`
  mutation DeletePerson($id: UUID!) {
    deletePerson(id: $id)
  }
`;

const CREATE_RELATIONSHIP = gql`
  mutation CreateRelationship($input: CreateRelationshipInput!) {
    createRelationship(input: $input) {
      id
    }
  }
`;

const DELETE_RELATIONSHIP = gql`
  mutation DeleteRelationship($id: UUID!) {
    deleteRelationship(id: $id)
  }
`;

const SEED_SAMPLE_DATA = gql`
  mutation SeedSampleData {
    seedSampleData
  }
`;

const GET_DUPLICATES = gql`
  query GetPotentialDuplicates {
    potentialDuplicates {
      personA {
        id
        firstName
        lastName
        gender
        birthDate
        estimatedBirthYear
        deathDate
        birthPlace
        photoUrl
        notes
      }
      personB {
        id
        firstName
        lastName
        gender
        birthDate
        estimatedBirthYear
        deathDate
        birthPlace
        photoUrl
        notes
      }
      confidence
      matchReason
    }
  }
`;

const MERGE_PEOPLE = gql`
  mutation MergePeople($sourceId: UUID!, $targetId: UUID!) {
    mergePeople(sourceId: $sourceId, targetId: $targetId) {
      id
      firstName
      lastName
    }
  }
`;

export default function DashboardClient() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  // Apollo operations
  const { data, loading, error, refetch } = useQuery<any>(GET_ALL_DATA, {
    skip: !user,
  });

  const [createPerson] = useMutation(CREATE_PERSON);
  const [updatePerson, { loading: updateLoading }] = useMutation(UPDATE_PERSON, {
    onCompleted: () => {
      setEditSection(null);
      refetch();
    },
    onError: (err) => {
      setErrorMsg("Failed to update profile: " + err.message);
    }
  });

  const [deletePerson] = useMutation(DELETE_PERSON);
  const [createRelationship] = useMutation(CREATE_RELATIONSHIP);
  const [deleteRelationship] = useMutation(DELETE_RELATIONSHIP);

  const [activeTab, setActiveTab] = useState<"people" | "relationships" | "graph" | "duplicates">("graph");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState<string>("ALL");
  const [centuryFilter, setCenturyFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState("");
  const [filterMode, setFilterMode] = useState<"highlight" | "hide">("highlight");

  // Lineage Tracer States
  const [traceSourceId, setTraceSourceId] = useState<string>("");
  const [traceTargetId, setTraceTargetId] = useState<string>("");
  const [lineagePathNodeIds, setLineagePathNodeIds] = useState<Set<string>>(new Set());
  const [lineagePathEdgeIds, setLineagePathEdgeIds] = useState<Set<string>>(new Set());

  // Merge States
  const [activeMergePair, setActiveMergePair] = useState<any | null>(null);
  const [mergeKeepId, setMergeKeepId] = useState<string>("");
  const [mergeDiscardId, setMergeDiscardId] = useState<string>("");
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // Drawer States
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"overview" | "family" | "notes">("overview");

  // View mode & collapse states
  const [viewMode, setViewMode] = useState<"network" | "pedigree" | "descendant">("network");
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());

  // Clear collapse state when switching view modes or selecting a different focal person
  useEffect(() => {
    setCollapsedNodeIds(new Set());
  }, [viewMode, selectedPersonId]);

  const handleCollapseNode = (nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  };

  const handleExpandNode = (nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  };

  // Seeding sample data
  const [seedSampleData, { loading: seedLoading }] = useMutation(SEED_SAMPLE_DATA, {
    onCompleted: () => {
      refetch();
      setErrorMsg(null);
    },
    onError: (err) => {
      setErrorMsg("Failed to seed sample data: " + err.message);
    }
  });

  const handleSeedSampleData = async () => {
    if (window.confirm("This will clear the current database and seed the default Pendragon family tree. Continue?")) {
      try {
        await seedSampleData();
      } catch (err) {
        // Error handled in onError
      }
    }
  };

  // Inline Edit states
  const [editSection, setEditSection] = useState<"profile" | "lifespan" | "notes" | null>(null);
  
  // Profile inline fields
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editGender, setEditGender] = useState("MALE");

  // Lifespan inline fields
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editEstBirthYear, setEditEstBirthYear] = useState("");
  const [editDeathDate, setEditDeathDate] = useState("");
  const [editIsLiving, setEditIsLiving] = useState(true);
  const [editBirthPlace, setEditBirthPlace] = useState("");

  // Notes inline fields
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  // ------------------------------------------------------------------------------
  // Search, Filter & Lineage Tracer Business Logic
  // ------------------------------------------------------------------------------

  const findLineagePath = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return { nodes: new Set<string>(), edges: new Set<string>() };

    const adj: { [key: string]: { node: string, edge: string }[] } = {};
    data?.people?.forEach((p: any) => adj[p.id] = []);
    
    data?.relationships?.forEach((rel: any) => {
      if (adj[rel.sourcePersonId] && adj[rel.targetPersonId]) {
        adj[rel.sourcePersonId].push({ node: rel.targetPersonId, edge: rel.id });
        adj[rel.targetPersonId].push({ node: rel.sourcePersonId, edge: rel.id });
      }
    });

    const queue: string[] = [sourceId];
    const visited = new Set<string>([sourceId]);
    const parent: { [key: string]: { node: string, edge: string } } = {};

    let found = false;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === targetId) {
        found = true;
        break;
      }

      const neighbors = adj[curr] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.node)) {
          visited.add(neighbor.node);
          parent[neighbor.node] = { node: curr, edge: neighbor.edge };
          queue.push(neighbor.node);
        }
      }
    }

    if (!found) return { nodes: new Set<string>(), edges: new Set<string>() };

    const pathNodes = new Set<string>();
    const pathEdges = new Set<string>();
    
    let temp = targetId;
    pathNodes.add(temp);
    
    while (temp !== sourceId) {
      const edgeInfo = parent[temp];
      if (!edgeInfo) break;
      pathNodes.add(edgeInfo.node);
      pathEdges.add(edgeInfo.edge);
      temp = edgeInfo.node;
    }

    return { nodes: pathNodes, edges: pathEdges };
  };

  useEffect(() => {
    if (traceSourceId && traceTargetId) {
      const { nodes, edges } = findLineagePath(traceSourceId, traceTargetId);
      setLineagePathNodeIds(nodes);
      setLineagePathEdgeIds(edges);
    } else {
      setLineagePathNodeIds(new Set<string>());
      setLineagePathEdgeIds(new Set<string>());
    }
  }, [traceSourceId, traceTargetId, data]);

  const isFilterActive = 
    genderFilter !== "ALL" || 
    centuryFilter !== "ALL" || 
    locationFilter.trim() !== "" || 
    (traceSourceId && traceTargetId);

  const matchesFilter = (p: any) => {
    if (genderFilter !== "ALL" && p.gender !== genderFilter) return false;
    
    if (centuryFilter !== "ALL") {
      const year = p.birthDate ? new Date(p.birthDate).getFullYear() : p.estimatedBirthYear;
      if (!year) return false;
      if (centuryFilter === "18" && (year < 1701 || year > 1800)) return false;
      if (centuryFilter === "19" && (year < 1801 || year > 1900)) return false;
      if (centuryFilter === "20" && (year < 1901 || year > 2000)) return false;
      if (centuryFilter === "21" && (year < 2001 || year > 2100)) return false;
    }

    if (locationFilter.trim() !== "") {
      if (!p.birthPlace || !p.birthPlace.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }
    }

    if (traceSourceId && traceTargetId) {
      if (!lineagePathNodeIds.has(p.id)) return false;
    }

    return true;
  };

  // 1. First, apply View Mode filter (Network vs Pedigree vs Descendant)
  const viewFilteredPeopleAndRels = React.useMemo(() => {
    if (!data?.people) return { people: [], relationships: [] };

    let basePeople = [...data.people];
    let baseRels = [...data.relationships];

    if (viewMode !== "network") {
      const focalId = selectedPersonId || basePeople.find((p: any) => !p.isUnknown)?.id;
      if (focalId) {
        let keepIds = new Set<string>();
        if (viewMode === "pedigree") {
          // Traverse upward
          keepIds.add(focalId);
          const queue = [focalId];
          while (queue.length > 0) {
            const currentId = queue.shift()!;
            baseRels.forEach((r: any) => {
              if (r.type === "PARENT_CHILD" && r.targetPersonId === currentId) {
                if (!keepIds.has(r.sourcePersonId)) {
                  keepIds.add(r.sourcePersonId);
                  queue.push(r.sourcePersonId);
                }
              }
            });
          }
        } else if (viewMode === "descendant") {
          // Traverse downward
          keepIds.add(focalId);
          const queue = [focalId];
          while (queue.length > 0) {
            const currentId = queue.shift()!;
            baseRels.forEach((r: any) => {
              if (r.type === "PARENT_CHILD" && r.sourcePersonId === currentId) {
                if (!keepIds.has(r.targetPersonId)) {
                  keepIds.add(r.targetPersonId);
                  queue.push(r.targetPersonId);
                }
              }
            });
          }
          // Also include partners of descendants
          const withPartners = new Set(keepIds);
          baseRels.forEach((r: any) => {
            if (r.type === "PARTNER") {
              if (keepIds.has(r.sourcePersonId) && !withPartners.has(r.targetPersonId)) {
                withPartners.add(r.targetPersonId);
              } else if (keepIds.has(r.targetPersonId) && !withPartners.has(r.sourcePersonId)) {
                withPartners.add(r.sourcePersonId);
              }
            }
          });
          keepIds = withPartners;
        }

        basePeople = basePeople.filter((p: any) => keepIds.has(p.id));
        baseRels = baseRels.filter((r: any) => keepIds.has(r.sourcePersonId) && keepIds.has(r.targetPersonId));
      }
    }

    return { people: basePeople, relationships: baseRels };
  }, [data, viewMode, selectedPersonId]);

  // Compute collapsed subtrees to hide
  const collapsedHiddenIds = React.useMemo(() => {
    const { people: basePeople, relationships: baseRels } = viewFilteredPeopleAndRels;
    if (collapsedNodeIds.size === 0) return new Set<string>();

    const hiddenIds = new Set<string>();
    const queue = Array.from(collapsedNodeIds);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      baseRels.forEach((r: any) => {
        if (r.type === "PARENT_CHILD" && r.sourcePersonId === currentId) {
          if (!hiddenIds.has(r.targetPersonId)) {
            hiddenIds.add(r.targetPersonId);
            queue.push(r.targetPersonId);
          }
        }
      });
    }

    // Hide spouses/partners of hidden descendants if they have no visible connections
    let addedSpouse = true;
    while (addedSpouse) {
      addedSpouse = false;
      basePeople.forEach((p: any) => {
        if (hiddenIds.has(p.id)) return;

        const isPartnerOfHidden = baseRels.some((r: any) => 
          r.type === "PARTNER" && 
          ((r.sourcePersonId === p.id && hiddenIds.has(r.targetPersonId)) || 
           (r.targetPersonId === p.id && hiddenIds.has(r.sourcePersonId)))
        );

        if (isPartnerOfHidden) {
          const hasVisibleParentChild = baseRels.some((r: any) => 
            r.type === "PARENT_CHILD" && 
            ((r.sourcePersonId === p.id && !hiddenIds.has(r.targetPersonId)) || 
             (r.targetPersonId === p.id && !hiddenIds.has(r.sourcePersonId)))
          );

          if (!hasVisibleParentChild) {
            hiddenIds.add(p.id);
            addedSpouse = true;
          }
        }
      });
    }

    return hiddenIds;
  }, [viewFilteredPeopleAndRels, collapsedNodeIds]);

  const displayedElements = React.useMemo(() => {
    const { people: basePeople, relationships: baseRels } = viewFilteredPeopleAndRels;
    
    // Filter base people and rels to exclude hidden descendants and collapsed roots
    const activeHidden = new Set([...Array.from(collapsedHiddenIds), ...Array.from(collapsedNodeIds)]);

    // Initial visible lists
    const visiblePeople = basePeople.filter((p: any) => !activeHidden.has(p.id));
    const visibleRels = baseRels.filter((r: any) => !activeHidden.has(r.sourcePersonId) && !activeHidden.has(r.targetPersonId));

    // Placeholders to add
    const placeholders: any[] = [];
    const placeholderRels: any[] = [];
    const addedPlaceholders = new Set<string>();

    // Scan for edges from visible parents to collapsed children
    baseRels.forEach((r: any) => {
      if (r.type === "PARENT_CHILD" && collapsedNodeIds.has(r.targetPersonId) && !activeHidden.has(r.sourcePersonId)) {
        const collapsedChildId = r.targetPersonId;
        const collapsedChild = basePeople.find((p: any) => p.id === collapsedChildId);
        if (collapsedChild) {
          const placeholderId = `collapsed-${collapsedChildId}`;
          
          if (!addedPlaceholders.has(placeholderId)) {
            addedPlaceholders.add(placeholderId);
            placeholders.push({
              id: placeholderId,
              firstName: collapsedChild.firstName,
              lastName: collapsedChild.lastName,
              isCollapsedPlaceholder: true,
              onExpand: handleExpandNode,
            });
          }

          placeholderRels.push({
            id: `edge-collapsed-${r.id}`,
            type: "PARENT_CHILD",
            sourcePersonId: r.sourcePersonId,
            targetPersonId: placeholderId,
            parentChildType: r.parentChildType,
            onCollapse: null,
          });
        }
      }
    });

    const finalPeople = [...visiblePeople, ...placeholders];
    const finalRels = [...visibleRels, ...placeholderRels];

    if (!isFilterActive) {
      return { people: finalPeople, relationships: finalRels };
    }

    if (filterMode === "hide") {
      const filteredPeople = finalPeople.filter(p => p.isCollapsedPlaceholder || matchesFilter(p));
      const keptIds = new Set(filteredPeople.map(p => p.id));
      const filteredRels = finalRels.filter(
        r => keptIds.has(r.sourcePersonId) && keptIds.has(r.targetPersonId)
      );
      return { people: filteredPeople, relationships: filteredRels };
    } else {
      const filteredPeople = finalPeople.map(p => {
        if (p.isCollapsedPlaceholder) return p;
        return {
          ...p,
          isFaded: !matchesFilter(p)
        };
      });
      const filteredRels = finalRels.map(r => {
        if (r.targetPersonId.startsWith("collapsed-")) return r;
        
        let isFaded = false;
        if (traceSourceId && traceTargetId) {
          isFaded = !lineagePathEdgeIds.has(r.id);
        } else {
          const sourcePerson = finalPeople.find(p => p.id === r.sourcePersonId);
          const targetPerson = finalPeople.find(p => p.id === r.targetPersonId);
          const sourceFaded = sourcePerson && !sourcePerson.isCollapsedPlaceholder && !matchesFilter(sourcePerson);
          const targetFaded = targetPerson && !targetPerson.isCollapsedPlaceholder && !matchesFilter(targetPerson);
          isFaded = sourceFaded || targetFaded;
        }
        return {
          ...r,
          isFaded
        };
      });
      return { people: filteredPeople, relationships: filteredRels };
    }
  }, [viewFilteredPeopleAndRels, collapsedHiddenIds, collapsedNodeIds, isFilterActive, filterMode, genderFilter, centuryFilter, locationFilter, lineagePathNodeIds, traceSourceId, traceTargetId, lineagePathEdgeIds]);

  const displayedPeople = React.useMemo(() => displayedElements.people, [displayedElements]);
  const displayedRelationships = React.useMemo(() => displayedElements.relationships, [displayedElements]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const results = data.people.filter((p: any) => {
      if (p.isUnknown) return false;
      
      const firstName = p.firstName.toLowerCase();
      const lastName = p.lastName.toLowerCase();
      const nickname = p.nickname ? p.nickname.toLowerCase() : "";
      const birthPlace = p.birthPlace ? p.birthPlace.toLowerCase() : "";
      
      const birthYear = p.birthDate ? new Date(p.birthDate).getFullYear().toString() : p.estimatedBirthYear?.toString() || "";
      const deathYear = p.deathDate ? new Date(p.deathDate).getFullYear().toString() : "";

      return terms.every(term => 
        firstName.includes(term) ||
        lastName.includes(term) ||
        nickname.includes(term) ||
        birthPlace.includes(term) ||
        birthYear.includes(term) ||
        deathYear.includes(term)
      );
    });

    setSearchResults(results.slice(0, 10));
  };

  const FiltersCard = () => {
    return (
      <div className={styles.filtersCard}>
        <div className={styles.filtersTitle}>Filters & Lineage</div>
        
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Filter Mode</span>
          <div className={styles.filterToggles}>
            <button
              type="button"
              className={`${styles.filterToggleBtn} ${filterMode === "highlight" ? styles.filterToggleBtnActive : ""}`}
              onClick={() => setFilterMode("highlight")}
            >
              Highlight
            </button>
            <button
              type="button"
              className={`${styles.filterToggleBtn} ${filterMode === "hide" ? styles.filterToggleBtnActive : ""}`}
              onClick={() => setFilterMode("hide")}
            >
              Hide
            </button>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Gender</span>
          <div className={styles.filterToggles}>
            {["ALL", "MALE", "FEMALE"].map((gender) => (
              <button
                key={gender}
                type="button"
                className={`${styles.filterToggleBtn} ${genderFilter === gender ? styles.filterToggleBtnActive : ""}`}
                onClick={() => setGenderFilter(gender)}
              >
                {gender === "ALL" ? "All" : gender === "MALE" ? "Male" : "Female"}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Birth Century</span>
          <select
            className={styles.filterSelect}
            value={centuryFilter}
            onChange={(e) => setCenturyFilter(e.target.value)}
          >
            <option value="ALL">All Centuries</option>
            <option value="18">18th Century (1701–1800)</option>
            <option value="19">19th Century (1801–1900)</option>
            <option value="20">20th Century (1901–2000)</option>
            <option value="21">21st Century (2001–2100)</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Birth Location</span>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="e.g. New York, London..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup} style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "12px" }}>
          <span className={styles.filterLabel} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Sparkles size={12} style={{ color: "#fbbf24" }} />
            <span>Trace Relationship Path</span>
          </span>
          <select
            className={styles.filterSelect}
            value={traceSourceId}
            onChange={(e) => setTraceSourceId(e.target.value)}
          >
            <option value="">Select Person A...</option>
            {data?.people?.filter((p: any) => !p.isUnknown).map((p: any) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={traceTargetId}
            onChange={(e) => setTraceTargetId(e.target.value)}
          >
            <option value="">Select Person B...</option>
            {data?.people?.filter((p: any) => !p.isUnknown).map((p: any) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
            ))}
          </select>
        </div>

        {isFilterActive && (
          <button
            type="button"
            className={styles.filterResetBtn}
            onClick={() => {
              setGenderFilter("ALL");
              setCenturyFilter("ALL");
              setLocationFilter("");
              setTraceSourceId("");
              setTraceTargetId("");
            }}
          >
            Clear All Filters
          </button>
        )}
      </div>
    );
  };

  // Duplicates Merge Sub-component
  const DuplicateMergeTab = ({ isReadOnly, refetchMainData }: { isReadOnly: boolean, refetchMainData: any }) => {
    const { data: dupData, loading: dupLoading, error: dupError, refetch: refetchDups } = useQuery<any>(GET_DUPLICATES, {
      fetchPolicy: "network-only"
    });

    const [mergePeople] = useMutation(MERGE_PEOPLE, {
      onError: (err) => {
        alert("Merge failed: " + err.message);
      },
      onCompleted: () => {
        setIsMergeModalOpen(false);
        setActiveMergePair(null);
        refetchMainData();
        refetchDups();
      }
    });

    const handleOpenMerge = (pair: any) => {
      setActiveMergePair(pair);
      setMergeKeepId(pair.personB.id);
      setMergeDiscardId(pair.personA.id);
      setIsMergeModalOpen(true);
    };

    const handleSwapMerge = () => {
      const temp = mergeKeepId;
      setMergeKeepId(mergeDiscardId);
      setMergeDiscardId(temp);
    };

    const handleConfirmMerge = () => {
      mergePeople({
        variables: {
          sourceId: mergeDiscardId,
          targetId: mergeKeepId
        }
      });
    };

    if (dupLoading) return <div className={styles.emptyState}>Analyzing database for duplicates...</div>;
    if (dupError) return <div className={styles.emptyState} style={{ color: "#ef4444" }}>Error detecting duplicates: {dupError.message}</div>;

    const pairs = dupData?.potentialDuplicates || [];

    return (
      <>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Likely Duplicate Detection & Merge Tool</h2>
        </div>

        {pairs.length === 0 ? (
          <div className={styles.emptyState} style={{ flexDirection: "column", gap: "10px" }}>
            <Sparkles size={48} style={{ color: "#10b981" }} />
            <h3>All Clean!</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No potential duplicate individuals detected in the tree.</p>
          </div>
        ) : (
          <div className={styles.duplicatesList}>
            {pairs.map((pair: any, idx: number) => {
              const pA = pair.personA;
              const pB = pair.personB;
              const birthA = pA.birthDate ? new Date(pA.birthDate).getFullYear() : pA.estimatedBirthYear || "?";
              const birthB = pB.birthDate ? new Date(pB.birthDate).getFullYear() : pB.estimatedBirthYear || "?";
              
              return (
                <div key={idx} className={styles.duplicateCard}>
                  <div className={styles.duplicateMeta}>
                    <span className={styles.duplicateConfidenceBadge}>
                      {Math.round(pair.confidence * 100)}% Match Confidence
                    </span>
                    <span className={styles.duplicateNames}>
                      {pA.firstName} {pA.lastName} (born {birthA}) ↔ {pB.firstName} {pB.lastName} (born {birthB})
                    </span>
                    <span className={styles.duplicateReason}>
                      <strong>Indicator:</strong> {pair.matchReason}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.createBtn}
                    onClick={() => handleOpenMerge(pair)}
                    disabled={isReadOnly}
                    title={isReadOnly ? "Viewers cannot merge records" : ""}
                  >
                    <span>Compare & Merge</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {isMergeModalOpen && activeMergePair && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ width: "900px", maxWidth: "95%" }}>
              <div className={styles.modalHeader}>
                <h3>Compare & Merge Candidates</h3>
                <button type="button" className={styles.closeBtn} onClick={() => setIsMergeModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <div className={styles.comparisonGrid}>
                  {(() => {
                    const isA = mergeDiscardId === activeMergePair.personA.id;
                    const person = isA ? activeMergePair.personA : activeMergePair.personB;
                    const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : person.estimatedBirthYear;
                    const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : (person.isLiving ? "Present" : "Deceased");
                    
                    return (
                      <div className={`${styles.comparisonCol} ${styles.comparisonColDiscard}`}>
                        <div className={styles.comparisonColHeader}>
                          <span className={styles.comparisonTitle}>Candidate to DISCARD & DELETE</span>
                          <span className={`${styles.comparisonBadge} ${styles.comparisonBadgeDelete}`}>DISCARD</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Full Name</span>
                          <span className={styles.comparisonVal}>{person.firstName} {person.lastName}</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Nickname</span>
                          <span className={styles.comparisonVal}>{person.nickname || "-"}</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Gender</span>
                          <span className={styles.comparisonVal}>{person.gender}</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Lifespan</span>
                          <span className={styles.comparisonVal}>{birthYear || "?"} – {deathYear || "?"}</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Birth Place</span>
                          <span className={styles.comparisonVal}>{person.birthPlace || "-"}</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Biography Notes</span>
                          <span className={styles.comparisonVal} style={{ whiteSpace: "pre-wrap", maxHeight: "100px", overflowY: "auto" }}>
                            {person.notes || "-"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <button
                      type="button"
                      className={styles.comparisonSwapBtn}
                      onClick={handleSwapMerge}
                      title="Swap Keep and Discard candidates"
                    >
                      <ArrowRightLeft size={20} />
                    </button>
                  </div>

                  {(() => {
                    const isB = mergeKeepId === activeMergePair.personB.id;
                    const person = isB ? activeMergePair.personB : activeMergePair.personA;
                    const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : person.estimatedBirthYear;
                    const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : (person.isLiving ? "Present" : "Deceased");
                    
                    return (
                      <div className={`${styles.comparisonCol} ${styles.comparisonColKeep} ${styles.comparisonColActive}`}>
                        <div className={styles.comparisonColHeader}>
                          <span className={styles.comparisonTitle}>Candidate to KEEP & UPDATE</span>
                          <span className={`${styles.comparisonBadge} ${styles.comparisonBadgeKeep}`}>KEEP</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Full Name</span>
                          <span className={styles.comparisonVal}>{person.firstName} {person.lastName}</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Nickname</span>
                          <span className={styles.comparisonVal}>{person.nickname || "-"}</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Gender</span>
                          <span className={styles.comparisonVal}>{person.gender}</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Lifespan</span>
                          <span className={styles.comparisonVal}>{birthYear || "?"} – {deathYear || "?"}</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Birth Place</span>
                          <span className={styles.comparisonVal}>{person.birthPlace || "-"}</span>
                        </div>
                        <div className={styles.comparisonRow}>
                          <span className={styles.comparisonLabel}>Biography Notes</span>
                          <span className={styles.comparisonVal} style={{ whiteSpace: "pre-wrap", maxHeight: "100px", overflowY: "auto" }}>
                            {person.notes || "-"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const keep = mergeKeepId === activeMergePair.personB.id ? activeMergePair.personB : activeMergePair.personA;
                    const discard = mergeKeepId === activeMergePair.personB.id ? activeMergePair.personA : activeMergePair.personB;
                    
                    const mergedName = `${keep.firstName} ${keep.lastName}`;
                    const mergedNick = keep.nickname || discard.nickname;
                    const mergedBirth = keep.birthDate || keep.estimatedBirthYear ? 
                      (keep.birthDate ? new Date(keep.birthDate).getFullYear() : keep.estimatedBirthYear) : 
                      (discard.birthDate ? new Date(discard.birthDate).getFullYear() : discard.estimatedBirthYear);
                    const mergedDeath = keep.deathDate ? new Date(keep.deathDate).getFullYear() : 
                      (keep.isLiving ? (discard.deathDate ? new Date(discard.notes).getFullYear() : "Present") : "Deceased");
                    
                    return (
                      <div className={styles.mergePreviewCard}>
                        <h4 style={{ display: "flex", alignItems: "center", gap: "6px", margin: "0 0 10px 0", color: "#6366f1" }}>
                          <Sparkles size={16} />
                          <span>Preview of Merged Individual</span>
                        </h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "12px" }}>
                          <div><strong>Name:</strong> {mergedName} {mergedNick && `"${mergedNick}"`}</div>
                          <div><strong>Lifespan:</strong> {mergedBirth || "?"} – {mergedDeath || "?"}</div>
                          <div><strong>Birthplace:</strong> {keep.birthPlace || discard.birthPlace || "-"}</div>
                        </div>
                        {discard.notes && keep.notes && (
                          <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                            * Biography notes of both candidates will be appended together.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "20px", padding: "12px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px" }}>
                  <AlertCircle size={20} style={{ color: "#ef4444", flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", color: "#ef4444", lineHeight: "1.4" }}>
                    <strong>Warning:</strong> Re-routing relationships and merging database records is permanent. If this merge creates parent-child loop cycles, the operation will be rejected.
                  </span>
                </div>
              </div>

              <div className={styles.modalFooter} style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsMergeModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className={styles.createBtn} style={{ background: "#ef4444" }} onClick={handleConfirmMerge}>
                  Confirm & Merge
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const handleSelectPerson = (id: string) => {
    setSelectedPersonId(id);
    setFocusedNodeId(id);
    setIsDrawerOpen(true);
    setEditSection(null);
    setDrawerTab("overview");
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setFocusedNodeId(null);
    setEditSection(null);
  };

  const handleJumpToRelative = (id: string) => {
    setSelectedPersonId(id);
    setFocusedNodeId(id);
    setEditSection(null);
  };

  const getSelectedPersonRelatives = (personId: string) => {
    if (!data || !data.people || !data.relationships) {
      return { parents: [], spouses: [], children: [], siblings: [] };
    }

    const peopleMap = new Map(data.people.map((p: any) => [p.id, p]));
    const parents: any[] = [];
    const spouses: any[] = [];
    const children: any[] = [];
    const siblings: any[] = [];

    const selected = peopleMap.get(personId);
    if (!selected) {
      return { parents: [], spouses: [], children: [], siblings: [] };
    }

    data.relationships.forEach((rel: any) => {
      if (rel.type === "PARENT_CHILD" && rel.targetPersonId === personId) {
        const parent = peopleMap.get(rel.sourcePersonId);
        if (parent) {
          parents.push({
            person: parent,
            relationType: rel.parentChildType,
          });
        }
      }

      if (rel.type === "PARENT_CHILD" && rel.sourcePersonId === personId) {
        const child = peopleMap.get(rel.targetPersonId);
        if (child) {
          children.push({
            person: child,
            relationType: rel.parentChildType,
          });
        }
      }

      if (rel.type === "PARTNER") {
        if (rel.sourcePersonId === personId) {
          const partner = peopleMap.get(rel.targetPersonId);
          if (partner) {
            spouses.push({
              person: partner,
              partnerType: rel.partnerType,
              startYear: rel.startYear,
              endYear: rel.endYear,
            });
          }
        } else if (rel.targetPersonId === personId) {
          const partner = peopleMap.get(rel.sourcePersonId);
          if (partner) {
            spouses.push({
              person: partner,
              partnerType: rel.partnerType,
              startYear: rel.startYear,
              endYear: rel.endYear,
            });
          }
        }
      }
    });

    const parentIds = parents.map((p: any) => p.person.id);
    if (parentIds.length > 0) {
      const siblingIds = new Set<string>();
      data.relationships.forEach((rel: any) => {
        if (
          rel.type === "PARENT_CHILD" &&
          parentIds.includes(rel.sourcePersonId) &&
          rel.targetPersonId !== personId
        ) {
          siblingIds.add(rel.targetPersonId);
        }
      });
      siblingIds.forEach((id) => {
        const sibling = peopleMap.get(id);
        if (sibling) {
          siblings.push({ person: sibling });
        }
      });
    }

    return { parents, spouses, children, siblings };
  };

  const handleStartEdit = (section: "profile" | "lifespan" | "notes") => {
    const person = data?.people?.find((p: any) => p.id === selectedPersonId);
    if (!person) return;

    setEditSection(section);
    
    if (section === "profile") {
      setEditFirstName(person.firstName || "");
      setEditLastName(person.lastName || "");
      setEditNickname(person.nickname || "");
      setEditGender(person.gender || "MALE");
    } else if (section === "lifespan") {
      setEditBirthDate(person.birthDate ? person.birthDate.substring(0, 10) : "");
      setEditEstBirthYear(person.estimatedBirthYear ? String(person.estimatedBirthYear) : "");
      setEditDeathDate(person.deathDate ? person.deathDate.substring(0, 10) : "");
      setEditIsLiving(person.isLiving ?? true);
      setEditBirthPlace(person.birthPlace || "");
    } else if (section === "notes") {
      setEditNotes(person.notes || "");
    }
  };

  const handleSaveEdit = async (section: "profile" | "lifespan" | "notes") => {
    const person = data?.people?.find((p: any) => p.id === selectedPersonId);
    if (!person) return;

    const input: any = {};

    if (section === "profile") {
      input.firstName = editFirstName;
      input.lastName = editLastName;
      input.nickname = editNickname || null;
      input.gender = editGender;
    } else if (section === "lifespan") {
      input.birthPlace = editBirthPlace || null;
      
      if (editBirthDate) {
        input.birthDate = `${editBirthDate}T00:00:00Z`;
        input.estimatedBirthYear = null;
      } else if (editEstBirthYear) {
        input.birthDate = null;
        input.estimatedBirthYear = parseInt(editEstBirthYear, 10) || null;
      } else {
        input.birthDate = null;
        input.estimatedBirthYear = null;
      }

      if (editIsLiving) {
        input.deathDate = null;
      } else if (editDeathDate) {
        input.deathDate = `${editDeathDate}T00:00:00Z`;
      } else {
        input.deathDate = null;
      }
    } else if (section === "notes") {
      input.notes = editNotes || null;
    }

    await updatePerson({
      variables: {
        id: selectedPersonId,
        input,
      }
    });
  };

  // Individual Form States
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState("MALE");
  const [isExactDate, setIsExactDate] = useState(true);
  const [birthDate, setBirthDate] = useState("");
  const [estimatedBirthYear, setEstimatedBirthYear] = useState("");
  const [isLiving, setIsLiving] = useState(true);
  const [deathDate, setDeathDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isUnknown, setIsUnknown] = useState(false);

  // Relationship Form States
  const [isRelModalOpen, setIsRelModalOpen] = useState(false);
  const [sourcePersonId, setSourcePersonId] = useState("");
  const [targetPersonId, setTargetPersonId] = useState("");
  const [relType, setRelType] = useState("PARENT_CHILD");
  const [parentChildType, setParentChildType] = useState("BIOLOGICAL");
  const [partnerType, setPartnerType] = useState("MARRIED");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");

  const selectedPerson = data?.people?.find((p: any) => p.id === selectedPersonId);
  const relatives = selectedPerson ? getSelectedPersonRelatives(selectedPerson.id) : null;

  // Auth Redirect Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className={styles.dashboardContainer} style={{ justifyContent: "center", alignItems: "center" }}>
        <div className={styles.title}>Loading session...</div>
      </div>
    );
  }

  // ------------------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------------------

  const isReadOnly = user.role === "Viewer";

  const handleOpenCreatePerson = () => {
    setEditPersonId(null);
    setFirstName("");
    setLastName("");
    setNickname("");
    setGender("MALE");
    setIsExactDate(true);
    setBirthDate("");
    setEstimatedBirthYear("");
    setIsLiving(true);
    setDeathDate("");
    setBirthPlace("");
    setPhotoUrl("");
    setNotes("");
    setIsUnknown(false);
    setErrorMsg(null);
    setIsPersonModalOpen(true);
  };

  const handleOpenEditPerson = (person: any) => {
    setEditPersonId(person.id);
    setFirstName(person.firstName);
    setLastName(person.lastName);
    setNickname(person.nickname || "");
    setGender(person.gender);
    setIsExactDate(!!person.birthDate);
    setBirthDate(person.birthDate ? person.birthDate.split("T")[0] : "");
    setEstimatedBirthYear(person.estimatedBirthYear?.toString() || "");
    setIsLiving(person.isLiving);
    setDeathDate(person.deathDate ? person.deathDate.split("T")[0] : "");
    setBirthPlace(person.birthPlace || "");
    setPhotoUrl(person.photoUrl || "");
    setNotes(person.notes || "");
    setIsUnknown(person.isUnknown);
    setErrorMsg(null);
    setIsPersonModalOpen(true);
  };

  const handlePersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Format dates to ISO strings compatible with backend
    const formattedBirthDate = isExactDate && birthDate ? `${birthDate}T00:00:00Z` : null;
    const formattedDeathDate = !isLiving && deathDate ? `${deathDate}T00:00:00Z` : null;
    const parsedEstimatedYear = !isExactDate && estimatedBirthYear ? parseInt(estimatedBirthYear, 10) : null;

    const inputPayload = {
      firstName: isUnknown ? "Unknown" : firstName,
      lastName: isUnknown ? "Person" : lastName,
      nickname: isUnknown ? null : nickname || null,
      gender,
      birthDate: formattedBirthDate,
      estimatedBirthYear: parsedEstimatedYear,
      deathDate: isLiving ? null : formattedDeathDate,
      birthPlace: isUnknown ? null : birthPlace || null,
      photoUrl: photoUrl || null,
      notes: notes || null,
      isUnknown,
    };

    try {
      if (editPersonId) {
        await updatePerson({
          variables: { id: editPersonId, input: inputPayload },
        });
      } else {
        await createPerson({
          variables: { input: inputPayload },
        });
      }
      setIsPersonModalOpen(false);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save individual record.");
    }
  };

  const handleDeletePerson = async (id: string) => {
    if (confirm("Are you sure you want to delete this individual? All their relationship records will be permanently removed as well.")) {
      try {
        await deletePerson({ variables: { id } });
        refetch();
      } catch (err: any) {
        alert(err.message || "Failed to delete individual.");
      }
    }
  };

  const handleOpenRelModal = () => {
    if (!data?.people || data.people.length === 0) {
      alert("Please add individuals to your tree before establishing relationships.");
      return;
    }
    setSourcePersonId(data.people[0].id);
    setTargetPersonId(data.people[0].id);
    setRelType("PARENT_CHILD");
    setParentChildType("BIOLOGICAL");
    setPartnerType("MARRIED");
    setStartYear("");
    setEndYear("");
    setErrorMsg(null);
    setIsRelModalOpen(true);
  };

  const handleRelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (sourcePersonId === targetPersonId) {
      setErrorMsg("Source and Target individuals cannot be the same.");
      return;
    }

    const inputPayload = {
      sourcePersonId,
      targetPersonId,
      type: relType,
      parentChildType: relType === "PARENT_CHILD" ? parentChildType : null,
      partnerType: relType === "PARTNER" ? partnerType : null,
      startYear: relType === "PARTNER" && startYear ? parseInt(startYear, 10) : null,
      endYear: relType === "PARTNER" && endYear ? parseInt(endYear, 10) : null,
    };

    try {
      await createRelationship({
        variables: { input: inputPayload },
      });
      setIsRelModalOpen(false);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to establish relationship.");
    }
  };

  const handleDeleteRel = async (id: string) => {
    if (confirm("Are you sure you want to delete this relationship?")) {
      try {
        await deleteRelationship({ variables: { id } });
        refetch();
      } catch (err: any) {
        alert(err.message || "Failed to delete relationship.");
      }
    }
  };

  // Helpers to lookup names in dropdown and table listings
  const getPersonName = (id: string) => {
    const person = data?.people?.find((p: any) => p.id === id);
    if (!person) return "Unknown";
    if (person.isUnknown) return `[Unknown Person] (${person.id.substring(0, 4)})`;
    return `${person.firstName} ${person.lastName}`;
  };

  const formatDateDisplay = (person: any) => {
    if (person.birthDate) {
      const year = new Date(person.birthDate).getFullYear();
      return person.isLiving ? `${year} - Present` : `${year} - ${person.deathDate ? new Date(person.deathDate).getFullYear() : 'Deceased'}`;
    }
    if (person.estimatedBirthYear) {
      return person.isLiving ? `Est. ${person.estimatedBirthYear} - Present` : `Est. ${person.estimatedBirthYear} - Deceased`;
    }
    return person.isLiving ? "Unknown - Present" : "Deceased";
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.gridOverlay}></div>

      {/* Left Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
        <div className={styles.sidebarBrand}>
          <Network size={24} style={{ color: '#6366f1', flexShrink: 0 }} />
          {!sidebarCollapsed && <span className={styles.sidebarLogoText}>Family Tree</span>}
          <button 
            type="button"
            onClick={toggleSidebar} 
            className={styles.sidebarCollapseToggleBtn} 
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          <button 
            type="button"
            className={`${styles.sidebarLink} ${activeTab === "graph" ? styles.sidebarLinkActive : ""}`}
            onClick={() => setActiveTab("graph")}
            title={sidebarCollapsed ? "Interactive Graph" : ""}
          >
            <GitBranch size={18} style={{ flexShrink: 0 }} />
            {!sidebarCollapsed && <span>Interactive Graph</span>}
          </button>
          <button 
            type="button"
            className={`${styles.sidebarLink} ${activeTab === "people" ? styles.sidebarLinkActive : ""}`}
            onClick={() => setActiveTab("people")}
            title={sidebarCollapsed ? `Individuals (${data?.people?.length || 0})` : ""}
          >
            <Users size={18} style={{ flexShrink: 0 }} />
            {!sidebarCollapsed && <span>Individuals ({data?.people?.length || 0})</span>}
          </button>
          <button 
            type="button"
            className={`${styles.sidebarLink} ${activeTab === "relationships" ? styles.sidebarLinkActive : ""}`}
            onClick={() => setActiveTab("relationships")}
            title={sidebarCollapsed ? `Relationships (${data?.relationships?.length || 0})` : ""}
          >
            <ArrowRightLeft size={18} style={{ flexShrink: 0 }} />
            {!sidebarCollapsed && <span>Relationships ({data?.relationships?.length || 0})</span>}
          </button>
          {!isReadOnly && (
            <button 
              type="button"
              className={`${styles.sidebarLink} ${activeTab === "duplicates" ? styles.sidebarLinkActive : ""}`}
              onClick={() => setActiveTab("duplicates")}
              title={sidebarCollapsed ? "Merge Tool" : ""}
            >
              <GitFork size={18} style={{ flexShrink: 0 }} />
              {!sidebarCollapsed && <span>Merge Tool</span>}
            </button>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          {!sidebarCollapsed && (
            <div className={styles.sidebarUser}>
              <span className={styles.sidebarUserLabel}>User Role</span>
              <span className={styles.sidebarUserName} title={user.username}>{user.username} ({user.role})</span>
            </div>
          )}
          <div className={styles.sidebarActions}>
            <button 
              type="button"
              onClick={logout} 
              className={styles.sidebarLogoutBtn} 
              title={sidebarCollapsed ? "Logout" : "Sign Out"}
            >
              <LogOut size={16} style={{ flexShrink: 0 }} />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Right Content Workspace */}
      <main className={styles.mainContent}>
        {loading ? (
          <div className={styles.emptyState}>Loading records...</div>
        ) : error ? (
          <div className={styles.emptyState} style={{ color: "#ef4444" }}>Error loading records: {error.message}</div>
        ) : (
          <div className={styles.mainPanel}>
            {activeTab === "graph" && (
              <>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Family Tree Visualization</h2>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {/* Fuzzy Search Bar */}
                    <div className={styles.searchContainer}>
                      <Search size={16} className={styles.searchIcon} />
                      <input 
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search by name, nickname, or year..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      />
                      {isSearchFocused && searchResults.length > 0 && (
                        <div className={styles.searchResultsDropdown}>
                          {searchResults.map((person) => {
                            const birthYr = person.birthDate ? new Date(person.birthDate).getFullYear() : person.estimatedBirthYear;
                            const deathYr = person.deathDate ? new Date(person.deathDate).getFullYear() : (person.isLiving ? "Present" : "Deceased");
                            const parents = data?.relationships
                              ?.filter((r: any) => r.targetPersonId === person.id && r.type === "PARENT_CHILD")
                              ?.map((r: any) => {
                                const parent = data?.people?.find((p: any) => p.id === r.sourcePersonId);
                                return parent ? `${parent.firstName} ${parent.lastName}` : null;
                              })
                              ?.filter(Boolean) || [];

                            return (
                              <button
                                key={person.id}
                                type="button"
                                className={styles.searchResultItem}
                                onClick={() => {
                                  handleSelectPerson(person.id);
                                  setSearchQuery("");
                                  setSearchResults([]);
                                }}
                              >
                                <span className={styles.searchResultName}>
                                  {person.firstName} {person.lastName}
                                  {person.nickname && ` (${person.nickname})`}
                                </span>
                                <span className={styles.searchResultDetails}>
                                  Lifespan: {birthYr || "?"} – {deathYr || "?"}
                                  {parents.length > 0 && ` | Parents: ${parents.join(" & ")}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* View Mode Selectors */}
                    <div className={styles.viewModeContainer}>
                      <button
                        type="button"
                        className={`${styles.viewModeBtn} ${viewMode === "network" ? styles.viewModeActive : ""}`}
                        onClick={() => setViewMode("network")}
                        title="Show full relationship network"
                      >
                        <Network size={15} />
                        <span className={styles.viewModeBtnText}>Network</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.viewModeBtn} ${viewMode === "pedigree" ? styles.viewModeActive : ""}`}
                        onClick={() => setViewMode("pedigree")}
                        title="Show ancestors of selected individual"
                      >
                        <GitBranch size={15} />
                        <span className={styles.viewModeBtnText}>Pedigree</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.viewModeBtn} ${viewMode === "descendant" ? styles.viewModeActive : ""}`}
                        onClick={() => setViewMode("descendant")}
                        title="Show descendants of selected individual"
                      >
                        <GitFork size={15} />
                        <span className={styles.viewModeBtnText}>Descendants</span>
                      </button>
                    </div>

                    {/* Seed button for SuperAdmin */}
                    {user?.role === "SuperAdmin" && (
                      <button
                        type="button"
                        className={styles.seedBtn}
                        onClick={handleSeedSampleData}
                        disabled={seedLoading}
                        title="Seed default Pendragon family tree"
                      >
                        <Sparkles size={15} />
                        <span>Seed Tree</span>
                      </button>
                    )}

                    <button 
                      className={styles.createBtn} 
                      onClick={handleOpenCreatePerson}
                      disabled={isReadOnly}
                      title={isReadOnly ? "Viewers cannot create records" : ""}
                    >
                      <UserPlus size={16} />
                      <span>Add Individual</span>
                    </button>
                  </div>
                </div>

                {data?.people?.length === 0 ? (
                  <div className={styles.emptyState}>No individuals added yet. Click "Add Individual" to begin.</div>
                ) : (
                  <div style={{ display: "flex", width: "100%", height: "calc(100vh - 120px)", position: "relative" }}>
                    {viewMode !== "network" && !selectedPersonId && (
                      <div className={styles.viewModeWarningBar}>
                        <Info size={14} />
                        <span>Viewing <strong>{viewMode === "pedigree" ? "Pedigree" : "Descendants"} chart</strong>. Please select an individual to focus the view.</span>
                      </div>
                    )}
                    <FamilyTreeFlow 
                      people={displayedPeople} 
                      relationships={displayedRelationships} 
                      onSelectPerson={handleSelectPerson}
                      focusedNodeId={focusedNodeId}
                      onCollapseNode={handleCollapseNode}
                    />

                    {/* Toggle Filters Button */}
                    <button 
                      type="button"
                      className={styles.toggleFiltersBtn} 
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <SlidersHorizontal size={14} />
                      <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
                    </button>
                    
                    {showFilters && (
                      <div style={{ position: "absolute", top: "54px", left: "16px", zIndex: 10 }}>
                        <FiltersCard />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === "people" && (
              <>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Individuals</h2>
                  <button 
                    className={styles.createBtn} 
                    onClick={handleOpenCreatePerson}
                    disabled={isReadOnly}
                    title={isReadOnly ? "Viewers cannot create records" : ""}
                  >
                    <UserPlus size={16} />
                    <span>Add Individual</span>
                  </button>
                </div>

                <div className={styles.tableContainer}>
                  {data.people.length === 0 ? (
                    <div className={styles.emptyState}>No individuals added yet. Click "Add Individual" to begin.</div>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.th}>Name</th>
                          <th className={styles.th}>Gender</th>
                          <th className={styles.th}>Lifespan</th>
                          <th className={styles.th}>Place of Birth</th>
                          <th className={styles.th}>Notes</th>
                          <th className={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.people.map((person: any) => (
                          <tr key={person.id} className={styles.tr}>
                            <td className={styles.td} style={{ fontWeight: 600 }}>
                              <button 
                                type="button" 
                                className={styles.listSelectLink}
                                onClick={() => handleSelectPerson(person.id)}
                                title="View Details in Drawer"
                              >
                                {person.isUnknown ? (
                                  <span style={{ fontStyle: "italic", opacity: 0.7 }}>[Unknown Placeholder]</span>
                                ) : (
                                  `${person.firstName} ${person.lastName}`
                                )}
                                {person.nickname && ` (${person.nickname})`}
                              </button>
                            </td>
                            <td className={styles.td}>
                              <span className={`${styles.badge} ${person.gender === "MALE" ? styles.badgeMale : person.gender === "FEMALE" ? styles.badgeFemale : styles.badgeUnknown}`}>
                                {person.gender}
                              </span>
                            </td>
                            <td className={styles.td}>
                              {formatDateDisplay(person)}
                            </td>
                            <td className={styles.td}>{person.birthPlace || "-"}</td>
                            <td className={styles.td} style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={person.notes}>
                              {person.notes || "-"}
                            </td>
                            <td className={styles.td}>
                              <div className={styles.actionsCell}>
                                <button 
                                  className={styles.actionIconBtn} 
                                  onClick={() => handleOpenEditPerson(person)}
                                  disabled={isReadOnly}
                                  title={isReadOnly ? "Viewers cannot edit records" : "Edit individual"}
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  className={`${styles.actionIconBtn} ${styles.deleteBtn}`} 
                                  onClick={() => handleDeletePerson(person.id)}
                                  disabled={isReadOnly}
                                  title={isReadOnly ? "Viewers cannot delete records" : "Delete individual"}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {activeTab === "relationships" && (
              <>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Relationships</h2>
                  <button 
                    className={styles.createBtn} 
                    onClick={handleOpenRelModal}
                    disabled={isReadOnly}
                    title={isReadOnly ? "Viewers cannot establish links" : ""}
                  >
                    <ArrowRightLeft size={16} />
                    <span>Establish Link</span>
                  </button>
                </div>

                <div className={styles.tableContainer}>
                  {data.relationships.length === 0 ? (
                    <div className={styles.emptyState}>No relationships established yet. Click "Establish Link" to begin.</div>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.th}>Source Person</th>
                          <th className={styles.th}>Relation Type</th>
                          <th className={styles.th}>Target Person</th>
                          <th className={styles.th}>Details</th>
                          <th className={styles.th}>Lifespan / Partnership</th>
                          <th className={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.relationships.map((rel: any) => (
                          <tr key={rel.id} className={styles.tr}>
                            <td className={styles.td} style={{ fontWeight: 600 }}>{getPersonName(rel.sourcePersonId)}</td>
                            <td className={styles.td}>
                              <span className={`${styles.badge} ${rel.type === "PARENT_CHILD" ? styles.badgeMale : styles.badgeUnknown}`} style={{ textTransform: "uppercase" }}>
                                {rel.type.replace("_", " ")}
                              </span>
                            </td>
                            <td className={styles.td} style={{ fontWeight: 600 }}>{getPersonName(rel.targetPersonId)}</td>
                            <td className={styles.td}>
                              {rel.type === "PARENT_CHILD" ? rel.parentChildType : rel.partnerType}
                            </td>
                            <td className={styles.td}>
                              {rel.type === "PARTNER" && rel.startYear 
                                ? `Since ${rel.startYear}${rel.endYear ? ` to ${rel.endYear}` : ""}`
                                : "-"}
                            </td>
                            <td className={styles.td}>
                              <div className={styles.actionsCell}>
                                <button 
                                  className={`${styles.actionIconBtn} ${styles.deleteBtn}`}
                                  onClick={() => handleDeleteRel(rel.id)}
                                  disabled={isReadOnly}
                                  title={isReadOnly ? "Read-only access" : "Remove relationship"}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {activeTab === "duplicates" && (
              <DuplicateMergeTab 
                isReadOnly={isReadOnly}
                refetchMainData={refetch}
              />
            )}
          </div>
        )}
      </main>

      {/* Right Detail Drawer */}
      <aside className={`${styles.drawer} ${isDrawerOpen && selectedPerson ? styles.drawerOpen : ""}`}>
        {selectedPerson && (
          <>
            <div className={styles.drawerHeader}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <span className={styles.drawerTitleBadge}>Individual Profile</span>
                <button 
                  type="button" 
                  className={styles.drawerCloseBtn} 
                  onClick={handleCloseDrawer}
                  title="Close Drawer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Profile Card Header */}
              <div className={styles.drawerProfileHero}>
                <div className={`${styles.drawerAvatar} ${selectedPerson.gender === "FEMALE" ? styles.avatarFemale : selectedPerson.gender === "MALE" ? styles.avatarMale : ""}`}>
                  {selectedPerson.isUnknown ? "?" : (selectedPerson.firstName?.[0] || "") + (selectedPerson.lastName?.[0] || "")}
                </div>

                <div style={{ flex: 1 }}>
                  {editSection === "profile" ? (
                    <div className={styles.inlineEditGroup}>
                      <input 
                        type="text" 
                        value={editFirstName} 
                        onChange={(e) => setEditFirstName(e.target.value)} 
                        placeholder="First Name"
                        className={styles.inlineInput}
                      />
                      <input 
                        type="text" 
                        value={editLastName} 
                        onChange={(e) => setEditLastName(e.target.value)} 
                        placeholder="Last Name"
                        className={styles.inlineInput}
                      />
                      <input 
                        type="text" 
                        value={editNickname} 
                        onChange={(e) => setEditNickname(e.target.value)} 
                        placeholder="Nickname"
                        className={styles.inlineInput}
                      />
                      <select 
                        value={editGender} 
                        onChange={(e) => setEditGender(e.target.value)}
                        className={styles.inlineSelect}
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>
                      <div className={styles.inlineActions}>
                        <button type="button" onClick={() => handleSaveEdit("profile")} className={styles.inlineSaveBtn} disabled={updateLoading}>
                          <Check size={14} /> Save
                        </button>
                        <button type="button" onClick={() => setEditSection(null)} className={styles.inlineCancelBtn}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      <h3 className={styles.drawerName}>
                        {selectedPerson.isUnknown ? (
                          <span style={{ fontStyle: "italic", opacity: 0.8 }}>[Unknown Placeholder]</span>
                        ) : (
                          `${selectedPerson.firstName} ${selectedPerson.lastName}`
                        )}
                        {!isReadOnly && (
                          <button 
                            type="button" 
                            className={styles.inlineEditTrigger} 
                            onClick={() => handleStartEdit("profile")}
                            title="Edit Name & Gender"
                          >
                            <Edit size={12} />
                          </button>
                        )}
                      </h3>
                      {selectedPerson.nickname && <span className={styles.drawerNickname}>"{selectedPerson.nickname}"</span>}
                      <span className={`${styles.badge} ${selectedPerson.gender === "MALE" ? styles.badgeMale : selectedPerson.gender === "FEMALE" ? styles.badgeFemale : styles.badgeUnknown}`} style={{ marginTop: "6px", display: "inline-block" }}>
                        {selectedPerson.gender}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className={styles.drawerTabs}>
              <button 
                type="button" 
                className={`${styles.drawerTab} ${drawerTab === "overview" ? styles.drawerTabActive : ""}`}
                onClick={() => setDrawerTab("overview")}
              >
                Overview
              </button>
              <button 
                type="button" 
                className={`${styles.drawerTab} ${drawerTab === "family" ? styles.drawerTabActive : ""}`}
                onClick={() => setDrawerTab("family")}
              >
                Direct Family
              </button>
              <button 
                type="button" 
                className={`${styles.drawerTab} ${drawerTab === "notes" ? styles.drawerTabActive : ""}`}
                onClick={() => setDrawerTab("notes")}
              >
                Biography
              </button>
            </div>

            {/* Scrollable Content */}
            <div className={styles.drawerContent}>
              {drawerTab === "overview" && (
                <div className={styles.drawerSection}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h4 className={styles.sectionTitle}>Overview</h4>
                    {!isReadOnly && editSection !== "lifespan" && (
                      <button 
                        type="button" 
                        className={styles.inlineEditTriggerSec} 
                        onClick={() => handleStartEdit("lifespan")}
                      >
                        <Edit size={12} /> Edit Lifespan
                      </button>
                    )}
                  </div>

                  {editSection === "lifespan" ? (
                    <div className={styles.inlineEditGroup}>
                      <div className={styles.formCheck} style={{ marginBottom: "10px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                          <input 
                            type="checkbox" 
                            checked={editIsLiving} 
                            onChange={(e) => setEditIsLiving(e.target.checked)} 
                          />
                          Is Living?
                        </label>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          Exact Birth Date:
                          <input 
                            type="date" 
                            value={editBirthDate} 
                            onChange={(e) => {
                              setEditBirthDate(e.target.value);
                              if (e.target.value) setEditEstBirthYear("");
                            }} 
                            className={styles.inlineInput}
                          />
                        </label>
                        
                        <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          Estimated Birth Year (if date unknown):
                          <input 
                            type="number" 
                            value={editEstBirthYear} 
                            onChange={(e) => {
                              setEditEstBirthYear(e.target.value);
                              if (e.target.value) setEditBirthDate("");
                            }} 
                            placeholder="e.g. 1956"
                            className={styles.inlineInput}
                          />
                        </label>

                        {!editIsLiving && (
                          <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Date of Death:
                            <input 
                              type="date" 
                              value={editDeathDate} 
                              onChange={(e) => setEditDeathDate(e.target.value)} 
                              className={styles.inlineInput}
                            />
                          </label>
                        )}

                        <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          Place of Birth:
                          <input 
                            type="text" 
                            value={editBirthPlace} 
                            onChange={(e) => setEditBirthPlace(e.target.value)} 
                            placeholder="Birth Place"
                            className={styles.inlineInput}
                          />
                        </label>
                      </div>

                      <div className={styles.inlineActions}>
                        <button type="button" onClick={() => handleSaveEdit("lifespan")} className={styles.inlineSaveBtn} disabled={updateLoading}>
                          <Check size={14} /> Save
                        </button>
                        <button type="button" onClick={() => setEditSection(null)} className={styles.inlineCancelBtn}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Lifespan:</span>
                        <span className={styles.metaValue}>{formatDateDisplay(selectedPerson)}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Living Status:</span>
                        <span className={styles.metaValue}>
                          <span className={selectedPerson.isLiving ? styles.statusLiving : styles.statusDeceased}>
                            {selectedPerson.isLiving ? "Living" : "Deceased"}
                          </span>
                        </span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Place of Birth:</span>
                        <span className={styles.metaValue} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={12} style={{ color: "var(--text-muted)" }} />
                          {selectedPerson.birthPlace || "Unknown"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === "family" && relatives && (
                <div className={styles.drawerSection}>
                  <h4 className={styles.sectionTitle} style={{ marginBottom: "12px" }}>Direct Family Relationships</h4>
                  
                  {/* Parents */}
                  <div style={{ marginBottom: "16px" }}>
                    <span className={styles.familyGroupLabel}>Parents</span>
                    {relatives.parents.length === 0 ? (
                      <div className={styles.emptyRelState}>No parents specified</div>
                    ) : (
                      <div className={styles.familyCardsGrid}>
                        {relatives.parents.map((p: any) => (
                          <button 
                            key={p.person.id} 
                            type="button" 
                            className={`${styles.relativeCard} ${p.person.gender === "FEMALE" ? styles.relCardFemale : p.person.gender === "MALE" ? styles.relCardMale : ""}`}
                            onClick={() => handleJumpToRelative(p.person.id)}
                            title={`Focus on ${p.person.firstName}`}
                          >
                            <span className={styles.relCardName}>{p.person.firstName} {p.person.lastName}</span>
                            <span className={styles.relCardRelation}>{p.relationType} PARENT</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Spouses/Partners */}
                  <div style={{ marginBottom: "16px" }}>
                    <span className={styles.familyGroupLabel}>Partners / Spouses</span>
                    {relatives.spouses.length === 0 ? (
                      <div className={styles.emptyRelState}>No partners specified</div>
                    ) : (
                      <div className={styles.familyCardsGrid}>
                        {relatives.spouses.map((s: any) => (
                          <button 
                            key={s.person.id} 
                            type="button" 
                            className={`${styles.relativeCard} ${s.person.gender === "FEMALE" ? styles.relCardFemale : s.person.gender === "MALE" ? styles.relCardMale : ""}`}
                            onClick={() => handleJumpToRelative(s.person.id)}
                            title={`Focus on ${s.person.firstName}`}
                          >
                            <span className={styles.relCardName}>{s.person.firstName} {s.person.lastName}</span>
                            <span className={styles.relCardRelation}>
                              {s.partnerType}
                              {s.startYear ? ` (since ${s.startYear}${s.endYear ? ` - ${s.endYear}` : ""})` : ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Children */}
                  <div style={{ marginBottom: "16px" }}>
                    <span className={styles.familyGroupLabel}>Children</span>
                    {relatives.children.length === 0 ? (
                      <div className={styles.emptyRelState}>No children specified</div>
                    ) : (
                      <div className={styles.familyCardsGrid}>
                        {relatives.children.map((c: any) => (
                          <button 
                            key={c.person.id} 
                            type="button" 
                            className={`${styles.relativeCard} ${c.person.gender === "FEMALE" ? styles.relCardFemale : c.person.gender === "MALE" ? styles.relCardMale : ""}`}
                            onClick={() => handleJumpToRelative(c.person.id)}
                            title={`Focus on ${c.person.firstName}`}
                          >
                            <span className={styles.relCardName}>{c.person.firstName} {c.person.lastName}</span>
                            <span className={styles.relCardRelation}>{c.relationType} CHILD</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Siblings */}
                  <div>
                    <span className={styles.familyGroupLabel}>Siblings</span>
                    {relatives.siblings.length === 0 ? (
                      <div className={styles.emptyRelState}>No siblings detected</div>
                    ) : (
                      <div className={styles.familyCardsGrid}>
                        {relatives.siblings.map((sib: any) => (
                          <button 
                            key={sib.person.id} 
                            type="button" 
                            className={`${styles.relativeCard} ${sib.person.gender === "FEMALE" ? styles.relCardFemale : sib.person.gender === "MALE" ? styles.relCardMale : ""}`}
                            onClick={() => handleJumpToRelative(sib.person.id)}
                            title={`Focus on ${sib.person.firstName}`}
                          >
                            <span className={styles.relCardName}>{sib.person.firstName} {sib.person.lastName}</span>
                            <span className={styles.relCardRelation}>SIBLING</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {drawerTab === "notes" && (
                <div className={styles.drawerSection}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h4 className={styles.sectionTitle}>Biography & Notes</h4>
                    {!isReadOnly && editSection !== "notes" && (
                      <button 
                        type="button" 
                        className={styles.inlineEditTriggerSec} 
                        onClick={() => handleStartEdit("notes")}
                      >
                        <Edit size={12} /> Edit Notes
                      </button>
                    )}
                  </div>

                  {editSection === "notes" ? (
                    <div className={styles.inlineEditGroup}>
                      <textarea 
                        value={editNotes} 
                        onChange={(e) => setEditNotes(e.target.value)} 
                        rows={6}
                        placeholder="Enter biographic notes..."
                        className={styles.inlineTextarea}
                      />
                      <div className={styles.inlineActions}>
                        <button type="button" onClick={() => handleSaveEdit("notes")} className={styles.inlineSaveBtn} disabled={updateLoading}>
                          <Check size={14} /> Save
                        </button>
                        <button type="button" onClick={() => setEditSection(null)} className={styles.inlineCancelBtn}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.drawerNotesBody}>
                      {selectedPerson.notes || "No biographic notes recorded for this individual."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* ------------------------------------------------------------------------
          Individual Create/Edit Modal
      ------------------------------------------------------------------------ */}
      {isPersonModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editPersonId ? "Edit Individual Profile" : "Add New Individual"}</h3>
              <button className={styles.closeBtn} onClick={() => setIsPersonModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePersonSubmit}>
              <div className={styles.modalBody}>
                {errorMsg && (
                  <div className={styles.warningBanner}>
                    <AlertTriangle size={18} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className={styles.formGrid}>
                  <div className={styles.fullWidth}>
                    <label className={styles.checkboxContainer}>
                      <input 
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isUnknown}
                        onChange={(e) => setIsUnknown(e.target.checked)}
                      />
                      <span className={styles.checkboxLabel}>Create as Unknown Placeholder (use for missing ancestors)</span>
                    </label>
                  </div>

                  {!isUnknown && (
                    <>
                      <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="firstName">First Name</label>
                        <input 
                          id="firstName"
                          type="text"
                          className={styles.input}
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. John"
                          required
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="lastName">Last Name</label>
                        <input 
                          id="lastName"
                          type="text"
                          className={styles.input}
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Smith"
                          required
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="nickname">Nickname / Also Known As</label>
                        <input 
                          id="nickname"
                          type="text"
                          className={styles.input}
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          placeholder="e.g. Johnny"
                        />
                      </div>
                    </>
                  )}

                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="gender">Gender</label>
                    <select 
                      id="gender"
                      className={styles.select}
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>

                  {!isUnknown && (
                    <div className={styles.inputGroup}>
                      <label className={styles.label} htmlFor="birthPlace">Birth Place</label>
                      <input 
                        id="birthPlace"
                        type="text"
                        className={styles.input}
                        value={birthPlace}
                        onChange={(e) => setBirthPlace(e.target.value)}
                        placeholder="e.g. London, UK"
                      />
                    </div>
                  )}

                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="photoUrl">Photo URL</label>
                    <input 
                      id="photoUrl"
                      type="url"
                      className={styles.input}
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="e.g. https://domain.com/photo.jpg"
                    />
                  </div>

                  {/* Lifespan configurations */}
                  <div className={styles.inputGroup}>
                    <label className={styles.checkboxContainer} style={{ marginTop: "10px" }}>
                      <input 
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isExactDate}
                        onChange={(e) => setIsExactDate(e.target.checked)}
                      />
                      <span className={styles.checkboxLabel}>Birth Date is Exact (uncheck for estimated year)</span>
                    </label>
                  </div>

                  <div className={styles.inputGroup}>
                    {isExactDate ? (
                      <>
                        <label className={styles.label} htmlFor="birthDate">Birth Date</label>
                        <input 
                          id="birthDate"
                          type="date"
                          className={styles.input}
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                        />
                      </>
                    ) : (
                      <>
                        <label className={styles.label} htmlFor="estYear">Estimated Birth Year</label>
                        <input 
                          id="estYear"
                          type="number"
                          min="1000"
                          max={new Date().getFullYear()}
                          className={styles.input}
                          value={estimatedBirthYear}
                          onChange={(e) => setEstimatedBirthYear(e.target.value)}
                          placeholder="e.g. 1945"
                        />
                      </>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.checkboxContainer} style={{ marginTop: "10px" }}>
                      <input 
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isLiving}
                        onChange={(e) => setIsLiving(e.target.checked)}
                      />
                      <span className={styles.checkboxLabel}>Individual is Living</span>
                    </label>
                  </div>

                  <div className={styles.inputGroup}>
                    {!isLiving && (
                      <>
                        <label className={styles.label} htmlFor="deathDate">Death Date</label>
                        <input 
                          id="deathDate"
                          type="date"
                          className={styles.input}
                          value={deathDate}
                          onChange={(e) => setDeathDate(e.target.value)}
                          required={!isLiving}
                        />
                      </>
                    )}
                  </div>

                  <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <label className={styles.label} htmlFor="notes">Biography / Historical Notes</label>
                    <textarea 
                      id="notes"
                      className={styles.textarea}
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add personal records, stories, or achievements..."
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsPersonModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.createBtn}>
                  {editPersonId ? "Save Changes" : "Create Individual"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------
          Relationship Create Modal
      ------------------------------------------------------------------------ */}
      {isRelModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: "480px" }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Establish Relationship</h3>
              <button className={styles.closeBtn} onClick={() => setIsRelModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRelSubmit}>
              <div className={styles.modalBody}>
                {errorMsg && (
                  <div className={styles.warningBanner}>
                    <AlertTriangle size={18} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className={styles.formGrid} style={{ gridTemplateColumns: "1fr" }}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="sourceId">Source Individual</label>
                    <select 
                      id="sourceId"
                      className={styles.select}
                      value={sourcePersonId}
                      onChange={(e) => setSourcePersonId(e.target.value)}
                    >
                      {data.people.map((p: any) => (
                        <option key={p.id} value={p.id}>{getPersonName(p.id)}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="relType">Relationship Type</label>
                    <select 
                      id="relType"
                      className={styles.select}
                      value={relType}
                      onChange={(e) => setRelType(e.target.value)}
                    >
                      <option value="PARENT_CHILD">Parent-Child</option>
                      <option value="PARTNER">Partner</option>
                    </select>
                  </div>

                  {relType === "PARENT_CHILD" ? (
                    <div className={styles.inputGroup}>
                      <label className={styles.label} htmlFor="pcType">Parent-Child Specific Link</label>
                      <select 
                        id="pcType"
                        className={styles.select}
                        value={parentChildType}
                        onChange={(e) => setParentChildType(e.target.value)}
                      >
                        <option value="BIOLOGICAL">Biological</option>
                        <option value="ADOPTIVE">Adoptive</option>
                        <option value="STEP">Step-Parent</option>
                        <option value="FOSTER">Foster Parent</option>
                        <option value="GUARDIAN">Guardian</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className={styles.inputGroup}>
                        <label className={styles.label} htmlFor="partnerType">Partner Specific Link</label>
                        <select 
                          id="partnerType"
                          className={styles.select}
                          value={partnerType}
                          onChange={(e) => setPartnerType(e.target.value)}
                        >
                          <option value="MARRIED">Married</option>
                          <option value="DIVORCED">Divorced</option>
                          <option value="SEPARATED">Separated</option>
                          <option value="UNMARRIED_DE_FACTO">Unmarried / De Facto</option>
                          <option value="WIDOWED">Widowed</option>
                        </select>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div className={styles.inputGroup}>
                          <label className={styles.label} htmlFor="startYear">Start Year</label>
                          <input 
                            id="startYear"
                            type="number"
                            min="1000"
                            className={styles.input}
                            value={startYear}
                            onChange={(e) => setStartYear(e.target.value)}
                            placeholder="e.g. 1998"
                          />
                        </div>
                        <div className={styles.inputGroup}>
                          <label className={styles.label} htmlFor="endYear">End Year</label>
                          <input 
                            id="endYear"
                            type="number"
                            min="1000"
                            className={styles.input}
                            value={endYear}
                            onChange={(e) => setEndYear(e.target.value)}
                            placeholder="e.g. 2012"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="targetId">Target Individual</label>
                    <select 
                      id="targetId"
                      className={styles.select}
                      value={targetPersonId}
                      onChange={(e) => setTargetPersonId(e.target.value)}
                    >
                      {data.people.map((p: any) => (
                        <option key={p.id} value={p.id}>{getPersonName(p.id)}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {relType === "PARENT_CHILD" 
                        ? "Meaning: Source is Parent of Target" 
                        : "Meaning: Source and Target are Partners"}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsRelModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.createBtn}>
                  Establish Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
