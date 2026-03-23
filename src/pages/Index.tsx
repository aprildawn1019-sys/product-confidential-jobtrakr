import { Routes, Route } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import Dashboard from "@/pages/Dashboard";
import Jobs from "@/pages/Jobs";
import Contacts from "@/pages/Contacts";
import Applications from "@/pages/Applications";
import Recommendations from "@/pages/Recommendations";
import JobSearch from "@/pages/JobSearch";
import { useJobTrackerStore } from "@/stores/jobTrackerStore";

export default function Index() {
  const store = useJobTrackerStore();

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64 p-8">
        <Routes>
          <Route index element={<Dashboard jobs={store.jobs} contacts={store.contacts} interviews={store.interviews} />} />
          <Route path="jobs" element={<Jobs jobs={store.jobs} onAdd={store.addJob} onUpdateStatus={store.updateJobStatus} onDelete={store.deleteJob} />} />
          <Route path="contacts" element={<Contacts contacts={store.contacts} onAdd={store.addContact} onDelete={store.deleteContact} />} />
          <Route path="applications" element={<Applications jobs={store.jobs} interviews={store.interviews} />} />
          <Route path="recommendations" element={<Recommendations />} />
        </Routes>
      </main>
    </div>
  );
}
