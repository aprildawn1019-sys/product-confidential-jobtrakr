

## Remove Applications Tab & Rename "Job Postings" to "Job Pipeline"

The Applications page duplicates functionality already in the Jobs page (status tracking, applied dates, interview display). Removing it simplifies navigation, and renaming "Job Postings" to "Job Pipeline" better reflects its purpose.

### Changes

1. **Remove Applications route and page**
   - `src/pages/Index.tsx`: Remove the `/applications` route and the `Applications` import
   - Delete `src/pages/Applications.tsx`

2. **Remove Applications from sidebar**
   - `src/components/AppSidebar.tsx`: Remove the Applications entry (`{ to: "/applications", icon: CalendarCheck, label: "Applications" }`) from the "Track & Apply" group, and remove the `CalendarCheck` import if unused elsewhere

3. **Rename "Job Postings" → "Job Pipeline"**
   - `src/components/AppSidebar.tsx`: Change the label from `"Job Postings"` to `"Job Pipeline"` in the sidebar nav item
   - `src/pages/Jobs.tsx`: Update the page heading from `"Job Postings"` to `"Job Pipeline"` and adjust the subtitle accordingly

