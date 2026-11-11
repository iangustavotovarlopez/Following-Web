import { useState } from 'react';
import { TeamsSection } from '../features/companies/presentation/pages/nested-resource-management';
import { CollaboratorRoleAssignmentsSection } from '../features/collaborators/presentation/pages/collaborator-role-assignments-section';
import { CollaboratorRolesSection } from '../features/collaborators/presentation/pages/collaborator-roles-section';
import { CollaboratorsSection } from '../features/collaborators/presentation/pages/collaborators-section';
import { useGlobalCompany } from './providers/company-context';

export function PeopleSection() {
  const { selectedCompanyId, selectedBranchId } = useGlobalCompany();
  const [activeTab, setActiveTab] = useState('collaborators');
  const [teamRevision, setTeamRevision] = useState(0);
  const tabs = [
    { id: 'collaborators', label: 'Collaborators' },
    { id: 'roles', label: 'Roles' },
    { id: 'teams', label: 'Teams' },
  ];

  return (
    <section className="resource-section companies-management people-management">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Catálogos</p>
          <h2>People</h2>
          <p className="muted">Administra colaboradores, roles y equipos.</p>
        </div>
      </div>
      <div className="management-tabs" role="tablist" aria-label="Catálogos de personas">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'management-tab active' : 'management-tab'}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="management-tab-content" role="tabpanel">
        {activeTab === 'collaborators' && <CollaboratorsSection />}
        {activeTab === 'roles' && (
          <div className="resource-grid">
            <CollaboratorRolesSection />
            <CollaboratorRoleAssignmentsSection />
          </div>
        )}
        {activeTab === 'teams' && (
          <TeamsSection
            key={`${selectedCompanyId}:${selectedBranchId}`}
            revision={teamRevision}
            onSaved={() => setTeamRevision((revision) => revision + 1)}
          />
        )}
      </div>
    </section>
  );
}
