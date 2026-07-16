'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { 
  GitBranch, Trash2, Edit, Plus, ArrowRightLeft, GitFork, 
  Info, Home, LogOut, Calendar, UserPlus, X, AlertTriangle 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../ThemeToggle";
import styles from "./dashboard.module.css";

import dynamic from "next/dynamic";

const FamilyTreeFlow = dynamic(
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

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"people" | "relationships" | "graph">("graph");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
  const [updatePerson] = useMutation(UPDATE_PERSON);
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

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Tree Dashboard</h1>
          <span className={styles.subtitle}>Manage individual family tree nodes and edges</span>
        </div>
        <div className={styles.headerActions}>
          <Link href="/" className={styles.backHomeBtn}>
            <Home size={16} />
            <span>Home</span>
          </Link>
          <span className={styles.userLabel}>
            {user.username} ({user.role})
          </span>
          <button onClick={logout} className={styles.logoutBtn}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === "graph" ? styles.activeTabBtn : ""}`}
          onClick={() => setActiveTab("graph")}
        >
          Graph View
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === "people" ? styles.activeTabBtn : ""}`}
          onClick={() => setActiveTab("people")}
        >
          Individuals ({data?.people?.length || 0})
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === "relationships" ? styles.activeTabBtn : ""}`}
          onClick={() => setActiveTab("relationships")}
        >
          Relationships ({data?.relationships?.length || 0})
        </button>
      </div>

      {/* Main Content Panels */}
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
                <FamilyTreeFlow people={data.people} relationships={data.relationships} />
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
                            {person.isUnknown ? (
                              <span style={{ fontStyle: "italic", opacity: 0.7 }}>[Unknown Placeholder]</span>
                            ) : (
                              `${person.firstName} ${person.lastName}`
                            )}
                            {person.nickname && ` (${person.nickname})`}
                          </td>
                          <td className={styles.td}>
                            <span className={`${styles.badge} ${person.gender === "MALE" ? styles.badgeMale : styles.badgeFemale}`}>
                              {person.gender.toLowerCase()}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <span className={`${styles.badge} ${person.isLiving ? styles.badgeLiving : styles.badgeDeceased}`}>
                              {formatDateDisplay(person)}
                            </span>
                          </td>
                          <td className={styles.td}>{person.birthPlace || "-"}</td>
                          <td className={styles.td} style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {person.notes || "-"}
                          </td>
                          <td className={styles.td}>
                            <div className={styles.actionsCell}>
                              <button 
                                className={styles.actionIconBtn}
                                onClick={() => handleOpenEditPerson(person)}
                                disabled={isReadOnly}
                                title={isReadOnly ? "Read-only access" : "Edit individual"}
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                className={`${styles.actionIconBtn} ${styles.deleteBtn}`}
                                onClick={() => handleDeletePerson(person.id)}
                                disabled={isReadOnly}
                                title={isReadOnly ? "Read-only access" : "Delete individual"}
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
                  title={isReadOnly ? "Viewers cannot create records" : ""}
                >
                  <ArrowRightLeft size={16} />
                  <span>Establish Relationship</span>
                </button>
              </div>

              <div className={styles.tableContainer}>
                {data.relationships.length === 0 ? (
                  <div className={styles.emptyState}>No relationships mapped yet. Click "Establish Relationship" to begin.</div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Source Individual</th>
                        <th className={styles.th}>Relation</th>
                        <th className={styles.th}>Target Individual</th>
                        <th className={styles.th}>Type Details</th>
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
