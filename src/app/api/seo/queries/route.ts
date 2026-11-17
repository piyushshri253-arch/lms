import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification';

const SETTING_QUERIES_KEY = 'seo_team_queries';

export interface SeoQueryReply {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

export interface SeoTeamQuery {
  id: string;
  title: string;
  description: string;
  courseId?: string;
  courseTitle?: string;
  specialistId: string;
  specialistName: string;
  specialistRole: string;
  category: 'ADS_BUDGET' | 'CONTENT_ISSUE' | 'KEYWORD_APPROVAL' | 'TECHNICAL_BLOCKER' | 'GENERAL';
  priority: 'URGENT' | 'NORMAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  replies: SeoQueryReply[];
  createdAt: string;
  updatedAt: string;
}

export async function GET(req: NextRequest) {
  try {
    let queries: SeoTeamQuery[] = [];
    const row = await prisma.platformSetting.findUnique({
      where: { key: SETTING_QUERIES_KEY }
    });

    if (row?.value) {
      try {
        queries = JSON.parse(row.value);
      } catch {}
    }

    if (queries.length === 0) {
      // Seed realistic initial questions so user can immediately test replying and resolving
      queries = [
        {
          id: 'qry_init_1',
          title: 'Google Ads Daily Budget Approval Needed (₹1,000/day)',
          description:
            'Sir, the search volume for Teacher Training Certification in Delhi-NCR is very high this week. Can we increase the daily budget from ₹500 to ₹1,000 to capture 2x more student admissions?',
          courseId: 'cmvt6dp6c0005jy08tbk6pw6e',
          courseTitle: 'Digital Campus & ERP Management',
          specialistId: 'cmwamhcrr0001x28crzxcvl2s',
          specialistName: 'Aman Sharma',
          specialistRole: 'Google Ads & PPC Specialist',
          category: 'ADS_BUDGET',
          priority: 'URGENT',
          status: 'OPEN',
          replies: [
            {
              id: 'rep_1',
              senderId: 'cmwamhcrr0001x28crzxcvl2s',
              senderName: 'Aman Sharma',
              senderRole: 'Google Ads Specialist',
              message: 'Estimated CPC is around ₹14. A ₹1,000 daily spend will deliver approximately 70 high-converting clicks daily.',
              createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
            }
          ],
          createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
        },
        {
          id: 'qry_init_2',
          title: 'Thumbnail Image Aspect Ratio & Hook Text Update',
          description:
            'The current course thumbnail does not adhere to the 1200x630 OpenGraph and 1080x1080 Instagram feed dimensions. Can the graphic designer provide the high-res 1:1 square crop?',
          courseId: 'cmvi37neq002jx2dsl2ltebve',
          courseTitle: 'Montessori Teaching Foundation',
          specialistId: 'cmwamhcrr0001x28crzxcvl2s',
          specialistName: 'Neha Patel',
          specialistRole: 'Meta Ads & Creative Specialist',
          category: 'CONTENT_ISSUE',
          priority: 'NORMAL',
          status: 'RESOLVED',
          replies: [
            {
              id: 'rep_2a',
              senderId: 'cmwamhcrr0001x28crzxcvl2s',
              senderName: 'Neha Patel',
              senderRole: 'Meta Ads Specialist',
              message: 'Requested 1:1 image format for Facebook & Insta feed carousel.',
              createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
            },
            {
              id: 'rep_2b',
              senderId: 'seo_manager_root',
              senderName: 'SEO Manager',
              senderRole: 'SEO_MANAGER',
              message: 'Approved! High-res asset uploaded under Media & Thumbnail tab. You can resume the ad creative setup.',
              createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
            }
          ],
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
        }
      ];

      await prisma.platformSetting.upsert({
        where: { key: SETTING_QUERIES_KEY },
        update: { value: JSON.stringify(queries) },
        create: { key: SETTING_QUERIES_KEY, value: JSON.stringify(queries) }
      });
    }

    return NextResponse.json({ success: true, queries });
  } catch (err: any) {
    console.error('[SEO Queries GET Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const row = await prisma.platformSetting.findUnique({
      where: { key: SETTING_QUERIES_KEY }
    });

    let currentList: SeoTeamQuery[] = [];
    if (row?.value) {
      try {
        currentList = JSON.parse(row.value);
      } catch {}
    }

    if (action === 'CREATE_QUERY') {
      const {
        title,
        description,
        courseId,
        courseTitle,
        specialistId,
        specialistName,
        specialistRole,
        category,
        priority
      } = body;

      if (!title || !description) {
        return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
      }

      const newQuery: SeoTeamQuery = {
        id: `qry_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        description: description.trim(),
        courseId: courseId || undefined,
        courseTitle: courseTitle || undefined,
        specialistId: specialistId || 'specialist_user',
        specialistName: specialistName || 'Team Member',
        specialistRole: specialistRole || 'SEO Specialist',
        category: category || 'GENERAL',
        priority: priority || 'NORMAL',
        status: 'OPEN',
        replies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedList = [newQuery, ...currentList];

      await prisma.platformSetting.upsert({
        where: { key: SETTING_QUERIES_KEY },
        update: { value: JSON.stringify(updatedList) },
        create: { key: SETTING_QUERIES_KEY, value: JSON.stringify(updatedList) }
      });

      // Notify SEO Managers
      try {
        const managers = await prisma.user.findMany({
          where: { role: { in: ['SEO_MANAGER', 'ADMIN'] } },
          select: { id: true }
        });
        for (const m of managers) {
          await createNotification({
            userId: m.id,
            title: `❓ New Team Query: ${title}`,
            message: `${specialistName} submitted an issue regarding ${courseTitle || 'general task'}: "${title}"`,
            type: 'SUPPORT',
            category: 'SUPPORT',
            link: '/seo?nav=Team+Queries'
          });
        }
      } catch {}

      return NextResponse.json({
        success: true,
        query: newQuery,
        message: 'Query submitted to SEO Manager successfully.'
      });
    }

    if (action === 'REPLY_QUERY') {
      const { queryId, message, senderId, senderName, senderRole } = body;

      if (!queryId || !message || !message.trim()) {
        return NextResponse.json({ error: 'queryId and non-empty message are required.' }, { status: 400 });
      }

      const targetIdx = currentList.findIndex((q) => q.id === queryId);
      if (targetIdx === -1) {
        return NextResponse.json({ error: 'Query not found' }, { status: 404 });
      }

      const newReply: SeoQueryReply = {
        id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        senderId: senderId || 'seo_manager',
        senderName: senderName || 'SEO Manager',
        senderRole: senderRole || 'SEO_MANAGER',
        message: message.trim(),
        createdAt: new Date().toISOString()
      };

      const updatedQuery: SeoTeamQuery = {
        ...currentList[targetIdx],
        replies: [...currentList[targetIdx].replies, newReply],
        status: currentList[targetIdx].status === 'OPEN' ? 'IN_PROGRESS' : currentList[targetIdx].status,
        updatedAt: new Date().toISOString()
      };

      currentList[targetIdx] = updatedQuery;

      await prisma.platformSetting.upsert({
        where: { key: SETTING_QUERIES_KEY },
        update: { value: JSON.stringify(currentList) },
        create: { key: SETTING_QUERIES_KEY, value: JSON.stringify(currentList) }
      });

      // Notify the original author
      try {
        if (updatedQuery.specialistId && senderRole === 'SEO_MANAGER') {
          await createNotification({
            userId: updatedQuery.specialistId,
            title: `💬 Manager Replied to Your Query`,
            message: `SEO Manager replied to "${updatedQuery.title}": "${message.slice(0, 80)}..."`,
            type: 'SUPPORT',
            category: 'SUPPORT',
            link: '/seo?nav=Team+Queries'
          });
        }
      } catch {}

      return NextResponse.json({
        success: true,
        query: updatedQuery,
        message: 'Reply delivered successfully.'
      });
    }

    if (action === 'RESOLVE_QUERY') {
      const { queryId, resolutionNote } = body;

      const targetIdx = currentList.findIndex((q) => q.id === queryId);
      if (targetIdx === -1) {
        return NextResponse.json({ error: 'Query not found' }, { status: 404 });
      }

      const updatedQuery: SeoTeamQuery = {
        ...currentList[targetIdx],
        status: 'RESOLVED',
        updatedAt: new Date().toISOString()
      };

      if (resolutionNote?.trim()) {
        updatedQuery.replies.push({
          id: `rep_resolve_${Date.now()}`,
          senderId: 'seo_manager',
          senderName: 'SEO Manager',
          senderRole: 'SEO_MANAGER',
          message: `✓ [RESOLVED]: ${resolutionNote.trim()}`,
          createdAt: new Date().toISOString()
        });
      }

      currentList[targetIdx] = updatedQuery;

      await prisma.platformSetting.upsert({
        where: { key: SETTING_QUERIES_KEY },
        update: { value: JSON.stringify(currentList) },
        create: { key: SETTING_QUERIES_KEY, value: JSON.stringify(currentList) }
      });

      return NextResponse.json({
        success: true,
        query: updatedQuery,
        message: 'Query marked as resolved.'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[SEO Queries POST Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
