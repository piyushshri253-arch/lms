import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const keys = await prisma.platformSetting.findMany({
      where: {
        key: {
          in: [
            'seo_google_service_account_email',
            'seo_google_service_account_key',
            'seo_ga4_property_id',
            'seo_google_ads_customer_id',
            'seo_google_ads_developer_token',
            'seo_meta_ad_account_id',
            'seo_meta_access_token',
            'seo_search_console_site_url'
          ]
        }
      }
    });

    const keyMap: Record<string, string> = {};
    for (const k of keys) {
      keyMap[k.key] = k.value;
    }

    return NextResponse.json({
      success: true,
      credentials: {
        searchConsoleSiteUrl: keyMap['seo_search_console_site_url'] || process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || 'https://morenateach.com',
        googleServiceAccountEmail: keyMap['seo_google_service_account_email'] || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
        googleServiceAccountKey: keyMap['seo_google_service_account_key'] ? '•••••••• (Configured)' : '',
        ga4PropertyId: keyMap['seo_ga4_property_id'] || process.env.GA4_PROPERTY_ID || '560471393',
        googleAdsCustomerId: keyMap['seo_google_ads_customer_id'] || process.env.GOOGLE_ADS_CUSTOMER_ID || '',
        googleAdsDeveloperToken: keyMap['seo_google_ads_developer_token'] ? '••••••••' : (process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? '••••••••' : ''),
        metaAdAccountId: keyMap['seo_meta_ad_account_id'] || process.env.META_AD_ACCOUNT_ID || '',
        metaAccessToken: keyMap['seo_meta_access_token'] ? '••••••••' : (process.env.META_ACCESS_TOKEN ? '••••••••' : '')
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let {
      searchConsoleSiteUrl,
      googleServiceAccountEmail,
      googleServiceAccountKey,
      ga4PropertyId,
      googleAdsCustomerId,
      googleAdsDeveloperToken,
      metaAdAccountId,
      metaAccessToken
    } = body;

    // Handle Live Connection Tests
    if (body.action === 'TEST_META') {
      const targetAct = metaAdAccountId || (await prisma.platformSetting.findUnique({ where: { key: 'seo_meta_ad_account_id' } }))?.value;
      const targetToken = (metaAccessToken && !metaAccessToken.includes('••••'))
        ? metaAccessToken
        : (await prisma.platformSetting.findUnique({ where: { key: 'seo_meta_access_token' } }))?.value;

      if (!targetAct || !targetToken) {
        return NextResponse.json({ error: 'Meta Ad Account ID and Access Token are required to test connection.' }, { status: 400 });
      }

      const cleanAct = targetAct.startsWith('act_') ? targetAct : `act_${targetAct}`;
      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${cleanAct}/insights?fields=campaign_id,campaign_name,spend,clicks&date_preset=last_30d&access_token=${targetToken}`
      );
      const metaData = await metaRes.json();
      if (!metaRes.ok) {
        return NextResponse.json({ error: metaData.error?.message || 'Meta API returned an error.' }, { status: 400 });
      }

      const count = Array.isArray(metaData.data) ? metaData.data.length : 0;
      return NextResponse.json({
        success: true,
        message: `Connected successfully to Meta! Found ${count} live campaign insights in Ad Account ${cleanAct}. Real ads telemetry is active! ✓`,
        campaignCount: count
      });
    }

    // Auto-parse client_email from JSON key if provided
    if (googleServiceAccountKey && typeof googleServiceAccountKey === 'string' && !googleServiceAccountKey.includes('••••')) {
      try {
        const parsed = JSON.parse(googleServiceAccountKey.trim());
        if (parsed.client_email) {
          googleServiceAccountEmail = parsed.client_email;
        }
      } catch {
        // Raw key or PEM, keep as is
      }
    }

    const upserts = [
      searchConsoleSiteUrl !== undefined && { key: 'seo_search_console_site_url', value: String(searchConsoleSiteUrl).trim() },
      googleServiceAccountEmail !== undefined && { key: 'seo_google_service_account_email', value: String(googleServiceAccountEmail).trim() },
      (googleServiceAccountKey !== undefined && !String(googleServiceAccountKey).includes('••••')) && { key: 'seo_google_service_account_key', value: String(googleServiceAccountKey).trim() },
      ga4PropertyId !== undefined && { key: 'seo_ga4_property_id', value: String(ga4PropertyId).trim() },
      googleAdsCustomerId !== undefined && { key: 'seo_google_ads_customer_id', value: String(googleAdsCustomerId).trim() },
      (googleAdsDeveloperToken !== undefined && !String(googleAdsDeveloperToken).includes('••••')) && { key: 'seo_google_ads_developer_token', value: String(googleAdsDeveloperToken).trim() },
      metaAdAccountId !== undefined && { key: 'seo_meta_ad_account_id', value: String(metaAdAccountId).trim() },
      (metaAccessToken !== undefined && !String(metaAccessToken).includes('••••')) && { key: 'seo_meta_access_token', value: String(metaAccessToken).trim() }
    ].filter(Boolean) as { key: string; value: string }[];

    for (const item of upserts) {
      await prisma.platformSetting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'API Credentials saved successfully! Live automated telemetry will now sync directly with your Google and Ad accounts.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
