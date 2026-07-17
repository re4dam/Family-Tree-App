'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { 
  GitBranch, Trash2, Edit, Plus, ArrowRightLeft, GitFork, 
  Info, Home, LogOut, Calendar, UserPlus, X, AlertTriangle,
  Network, Users, ChevronLeft, ChevronRight, Check, MapPin
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

export default function DashboardClient() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"people" | "relationships" | "graph">("graph");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Drawer States
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"overview" | "family" | "notes">("overview");

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

  const selectedPerson = data?.people?.find((p: any) => p.id === selectedPersonId);
  const relatives = selectedPerson ? getSelectedPersonRelatives(selectedPerson.id) : null;
  const [deletePerson] = useMutation(DELETE_PERSON);
  const [createRelationship] = useMutation(CREATE_RELATIONSHIP);
  const [deleteRelationship] = useMutation(DELETE_RELATIONSHIP);

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
                  <div style={{ display: "flex", gap: "10px" }}>
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
                  <FamilyTreeFlow 
                    people={data.people} 
                    relationships={data.relationships} 
                    onSelectPerson={handleSelectPerson}
                    focusedNodeId={focusedNodeId}
                  />
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
