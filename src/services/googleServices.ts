import { db, auth } from '../firebase/config';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface TaskItem {
  id: string;
  title: string;
  due?: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  completionProbability: number;
  energyEstimation: number;
  countdown: string;
  dependencies: string[];
}

export interface EmailFeed {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

export interface ContactPerson {
  id: string;
  name: string;
  email: string;
}

export class GoogleServices {
  /**
   * Sync all Google Workspace elements to Firestore Cache
   */
  public static async syncWorkspaceToFirestore(uid: string, accessToken: string | null): Promise<void> {
    if (!accessToken) {
      console.warn('Google Access Token missing. Seeding fallback mock workspace.');
      await this.seedMockDataToFirestore(uid);
      return;
    }

    try {
      // 1. Sync Calendar
      const events = await this.fetchCalendarEvents(accessToken);
      for (const ev of events) {
        await setDoc(doc(db, `users/${uid}/calendar_cache`, ev.id), ev);
      }

      // 2. Sync Tasks
      const tasks = await this.fetchTasks(accessToken);
      for (const t of tasks) {
        await setDoc(doc(db, `users/${uid}/tasks`, t.id), t);
      }

      // 3. Sync Gmail
      const emails = await this.fetchEmails(accessToken);
      for (const email of emails) {
        await setDoc(doc(db, `users/${uid}/gmail_cache`, email.id), email);
      }

      // 4. Sync Drive Files
      const files = await this.fetchDriveFiles(accessToken);
      for (const f of files) {
        await setDoc(doc(db, `users/${uid}/drive_cache`, f.id), f);
      }

      // 5. Sync People API Contacts
      const contacts = await this.fetchPeopleContacts(accessToken);
      for (const c of contacts) {
        await setDoc(doc(db, `users/${uid}/people_cache`, c.id), c);
      }

      console.log('Google Workspace synchronized to Firestore cache.');
    } catch (err) {
      console.error('Firestore cache workspace sync failed, seeding fallback mock data:', err);
      await this.seedMockDataToFirestore(uid);
    }
  }

  // --- API Fetch Routines ---

  private static async fetchCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
    const timeMin = new Date().toISOString();
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=15&orderBy=startTime&singleEvents=true&timeMin=${timeMin}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error('Calendar fetch failure');
    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      summary: (item.summary || 'UNTITLED SPRINT').toUpperCase(),
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      description: item.description || '',
      threatLevel: item.summary?.toLowerCase().includes('critical') || item.summary?.toLowerCase().includes('sync') ? 'CRITICAL' : 'MEDIUM',
    }));
  }

  private static async fetchTasks(accessToken: string): Promise<TaskItem[]> {
    const listRes = await fetch('https://www.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!listRes.ok) throw new Error('Task lists fetch failure');
    const lists = await listRes.json();
    const primaryListId = lists.items?.[0]?.id;
    if (!primaryListId) return [];

    const taskRes = await fetch(
      `https://www.googleapis.com/tasks/v1/lists/${primaryListId}/tasks?maxResults=20&showCompleted=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!taskRes.ok) throw new Error('Tasks fetch failure');
    const data = await taskRes.json();

    return (data.items || []).map((item: any) => {
      const risk = Math.floor(40 + Math.random() * 55);
      const compl = Math.floor(50 + Math.random() * 45);
      const energy = Math.floor(20 + Math.random() * 70);
      const threat: TaskItem['threatLevel'] = risk > 85 ? 'CRITICAL' : risk > 70 ? 'HIGH' : risk > 40 ? 'MEDIUM' : 'LOW';

      return {
        id: item.id,
        title: (item.title || 'UNNAMED DIRECTIVE').toUpperCase(),
        due: item.due || '',
        notes: item.notes || 'GOOGLE TASKS INGESTION.',
        status: item.status || 'needsAction',
        threatLevel: threat,
        riskScore: risk,
        completionProbability: compl,
        energyEstimation: energy,
        countdown: '04:12:00',
        dependencies: [],
      };
    });
  }

  private static async fetchEmails(accessToken: string): Promise<EmailFeed[]> {
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is:unread',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error('Gmail fetch failure');
    const data = await response.json();
    const messages = data.messages || [];
    const feeds: EmailFeed[] = [];

    for (const msg of messages) {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const headers = detail.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'NO SUBJECT';
        const from = headers.find((h: any) => h.name === 'From')?.value || 'UNKNOWN SENDER';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';
        
        feeds.push({
          id: msg.id,
          subject: subject.toUpperCase(),
          from: from.toUpperCase(),
          date,
          snippet: detail.snippet || '',
          priority: subject.toLowerCase().includes('urgent') || subject.toLowerCase().includes('alarm') ? 'CRITICAL' : 'MEDIUM',
        });
      }
    }
    return feeds;
  }

  private static async fetchDriveFiles(accessToken: string): Promise<DriveFile[]> {
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?pageSize=10&orderBy=viewedByMeTime%20desc&fields=files(id,%20name,%20mimeType,%20webViewLink)',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error('Drive fetch failure');
    const data = await response.json();
    return (data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name.toUpperCase(),
      mimeType: file.mimeType || '',
      webViewLink: file.webViewLink || '',
    }));
  }

  private static async fetchPeopleContacts(accessToken: string): Promise<ContactPerson[]> {
    const response = await fetch(
      'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses&pageSize=10',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error('People fetch failure');
    const data = await response.json();
    return (data.connections || []).map((person: any) => {
      const name = person.names?.[0]?.displayName || 'UNKNOWN CONTACT';
      const email = person.emailAddresses?.[0]?.value || '';
      return {
        id: person.resourceName?.split('/')?.[1] || Math.random().toString(),
        name: name.toUpperCase(),
        email: email.toUpperCase(),
      };
    });
  }

  // --- Seed Mock Datasets if Offline/No Access Token ---

  private static async seedMockDataToFirestore(uid: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Retrieve display name or email prefix of currently logged-in user
      const currentUser = auth.currentUser;
      const email = currentUser?.email || '';
      let operatorName = currentUser?.displayName || '';
      if (!operatorName && email) {
        operatorName = email.split('@')[0].toUpperCase();
      }
      if (!operatorName) {
        operatorName = 'OPERATOR';
      }
      operatorName = operatorName.toUpperCase();

      const mockCalendar = [
        { id: 'mock-cal-1', summary: `${operatorName} STUDY & CODING SPRINT`, start: `${today}T13:00:00`, end: `${today}T15:00:00`, description: `FINAL EDIT REVIEW AND SLIDES PRACTICE SPRINT FOR ${operatorName}.`, threatLevel: 'CRITICAL' },
        { id: 'mock-cal-2', summary: `${operatorName} STRATEGY WORKSHOP`, start: `${today}T16:00:00`, end: `${today}T17:00:00`, description: `WEEKLY PRODUCT VELOCITY ALIGNMENT FOR ${operatorName}.`, threatLevel: 'HIGH' }
      ];
      for (const ev of mockCalendar) {
        await setDoc(doc(db, `users/${uid}/calendar_cache`, ev.id), ev);
      }

      const mockTasks = [
        { id: 'mock-tsk-1', title: `COMPILE HACKATHON DOCUMENTATION FOR ${operatorName}`, due: new Date().toISOString(), notes: 'COMPLETE README AND DEPLOYMENT GUIDE.', status: 'needsAction', threatLevel: 'CRITICAL', riskScore: 98, completionProbability: 35, energyEstimation: 80, countdown: '02:00:00', dependencies: ['SCREENSHOT PACK'] },
        { id: 'mock-tsk-2', title: `OPTIMIZE INTERFACE STYLING FOR ${operatorName}`, due: new Date(Date.now() + 86400000).toISOString(), notes: 'POLISH LIQUID GLASS DESIGN.', status: 'needsAction', threatLevel: 'HIGH', riskScore: 68, completionProbability: 60, energyEstimation: 45, countdown: '24:00:00', dependencies: [] }
      ];
      for (const t of mockTasks) {
        await setDoc(doc(db, `users/${uid}/tasks`, t.id), t);
      }

      const mockEmails = [
        { id: 'mock-em-1', subject: `[URGENT] CLIENT MILESTONE OVERDUE FOR ${operatorName}`, from: 'DIRECTOR@GLOBAL-STRATEGY.COM', date: '3 MINS AGO', snippet: `Hi ${operatorName}, the final deck is overdue. Please deploy completed work immediately.`, priority: 'CRITICAL' }
      ];
      for (const em of mockEmails) {
        await setDoc(doc(db, `users/${uid}/gmail_cache`, em.id), em);
      }

      const mockDrive = [
        { id: 'mock-drv-1', name: `${operatorName}_WORKSPACE_SPECS.PDF`, mimeType: 'application/pdf', webViewLink: 'https://drive.google.com' }
      ];
      for (const f of mockDrive) {
        await setDoc(doc(db, `users/${uid}/drive_cache`, f.id), f);
      }

      const mockContacts = [
        { id: 'mock-con-1', name: `SUPERVISOR DR. MILLER`, email: 'MILLER.PROF@UNIVERSITY.EDU' }
      ];
      for (const c of mockContacts) {
        await setDoc(doc(db, `users/${uid}/people_cache`, c.id), c);
      }
    } catch (e) {
      console.error('Mock seeding to Firestore cache failed:', e);
    }
  }

  // --- Retrofit Legacy Wrappers to prevent UI breakage ---

  public static async getCalendarEvents(accessToken: string | null): Promise<CalendarEvent[]> {
    if (!accessToken) return this.getMockEvents();
    try { return await this.fetchCalendarEvents(accessToken); } catch { return this.getMockEvents(); }
  }

  public static async getTasks(accessToken: string | null): Promise<TaskItem[]> {
    if (!accessToken) return this.getMockTasks();
    try { return await this.fetchTasks(accessToken); } catch { return this.getMockTasks(); }
  }

  public static async getEmails(accessToken: string | null): Promise<EmailFeed[]> {
    if (!accessToken) return this.getMockEmails();
    try { return await this.fetchEmails(accessToken); } catch { return this.getMockEmails(); }
  }

  private static getMockEvents(): CalendarEvent[] {
    const today = new Date().toISOString().split('T')[0];
    return [
      { id: 'ev-1', summary: 'CRITICAL HACKATHON BUILD SPRINT', start: `${today}T13:00:00`, end: `${today}T15:00:00`, description: 'MANDATORY CORE FEATURE COMPILATION FOR HACKATHON STACK.', threatLevel: 'CRITICAL' },
      { id: 'ev-2', summary: 'PRODUCT DEMO PREPARATION', start: `${today}T16:00:00`, end: `${today}T17:00:00`, description: 'REVIEW DEMO SCREENPLAY AND RECORD PRESENTATION.', threatLevel: 'HIGH' }
    ];
  }

  private static getMockTasks(): TaskItem[] {
    return [
      { id: 't-1', title: 'RESOLVE SYSTEM BUILD WARNINGS', due: new Date().toISOString(), notes: 'RESOLVE TYPESCRIPT WARNINGS AND BUILD ERRORS.', status: 'needsAction', threatLevel: 'CRITICAL', riskScore: 98, completionProbability: 45, energyEstimation: 85, countdown: '01:14:22', dependencies: ['BUILD LOGS'] },
      { id: 't-2', title: 'OPTIMIZE COMPONENT STYLING', due: new Date(Date.now() + 172800000).toISOString(), notes: 'POLISH RESPONSIVE GRID LAYOUTS FOR COMPACT DEVICES.', status: 'needsAction', threatLevel: 'HIGH', riskScore: 82, completionProbability: 72, energyEstimation: 60, countdown: '12:45:00', dependencies: [] }
    ];
  }

  private static getMockEmails(): EmailFeed[] {
    return [
      { id: 'm-1', subject: '[ALIGNED] FINAL PROJECT PROPOSAL APPROVED', from: 'JUDGES@GOOGLE-AI-HACKATHON.COM', date: '10 MINS AGO', snippet: 'YOUR SUBMISSION ARCHITECTURE REPORT HAS BEEN SUCCESSFULLY REVIEWED.', priority: 'CRITICAL' }
    ];
  }
}
