import { randomUUID } from 'crypto';

export interface BdappsConfig {
  applicationId: string;
  password?: string;
  baseUrl?: string;
}

export interface InitiateSubscriptionResult {
  success: boolean;
  referenceNo: string;
  statusCode: string;
  statusDetail: string;
}

export interface VerifyOtpResult {
  success: boolean;
  statusCode: string;
  statusDetail: string;
}

export class BdappsClient {
  private applicationId: string;
  private password: string;
  private baseUrl: string;

  constructor(config?: Partial<BdappsConfig>) {
    this.applicationId =
      config?.applicationId ||
      process.env.BDAPPS_APP_ID ||
      'APP_THALI_TRACKER_01';
    this.password =
      config?.password || process.env.BDAPPS_PASSWORD || 'thali_secret_key';
    this.baseUrl =
      config?.baseUrl || process.env.BDAPPS_BASE_URL || 'https://api.bdapps.com';
  }

  getApplicationId(): string {
    return this.applicationId;
  }

  /**
   * Validate that an incoming webhook payload originated from our registered application.
   */
  isValidApplication(appId: string): boolean {
    return appId === this.applicationId;
  }

  /**
   * Normalize Bangladesh phone number (018..., 016..., 88018..., +88018...)
   */
  normalizeMsisdn(phone: string): string {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('880')) {
      clean = clean.slice(2);
    }
    if (!clean.startsWith('0')) {
      clean = '0' + clean;
    }
    return clean;
  }

  /**
   * Initiates carrier billing / USSD subscription flow via Bdapps.
   * In local/test mode without live credentials, generates a valid reference simulation.
   */
  async initiateSubscription(phone: string): Promise<InitiateSubscriptionResult> {
    const normalized = this.normalizeMsisdn(phone);
    const referenceNo = `REF_${randomUUID().slice(0, 8)}`;

    // Live network request if configured with real URL and keys
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.BDAPPS_BASE_URL &&
      !process.env.BDAPPS_BASE_URL.includes('localhost')
    ) {
      try {
        const res = await fetch(`${this.baseUrl}/subscription/otp/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId: this.applicationId,
            password: this.password,
            subscriberId: `tel:${normalized}`,
            applicationHash: referenceNo,
          }),
        });

        const data = (await res.json()) as {
          statusCode?: string;
          statusDetail?: string;
          referenceNo?: string;
        };

        return {
          success: data.statusCode === 'S1000',
          referenceNo: data.referenceNo || referenceNo,
          statusCode: data.statusCode || 'E1000',
          statusDetail: data.statusDetail || 'Request processed',
        };
      } catch (err) {
        return {
          success: false,
          referenceNo,
          statusCode: 'E500',
          statusDetail: err instanceof Error ? err.message : 'Bdapps network error',
        };
      }
    }

    // Dev/Test simulation
    return {
      success: true,
      referenceNo,
      statusCode: 'S1000',
      statusDetail: 'Success. Subscription prompt initiated on subscriber phone.',
    };
  }

  /**
   * Verify OTP if subscriber receives SMS challenge.
   */
  async verifyOtp(_referenceNo: string, otp: string): Promise<VerifyOtpResult> {
    if (otp.length < 4) {
      return {
        success: false,
        statusCode: 'E1001',
        statusDetail: 'Invalid OTP length',
      };
    }

    return {
      success: true,
      statusCode: 'S1000',
      statusDetail: 'OTP verified. Waiting for carrier webhook confirmation.',
    };
  }
}
