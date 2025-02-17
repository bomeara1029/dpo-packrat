/* eslint-disable @typescript-eslint/no-explicit-any */
import { IAuth, VerifyUserResult } from '../interface';
import { Config, LDAPConfig } from '../../config';
import * as LOG from '../../utils/logger';
import * as LDAP from 'ldapjs';

type UserSearchResult = {
    success: boolean;
    error?: string | null;
    DN: string | null;
};

class LDAPAuth implements IAuth {
    private _ldapConfig: LDAPConfig = Config.auth.ldap;
    private _client: LDAP.Client | null = null;
    async verifyUser(email: string, password: string): Promise<VerifyUserResult> {
        try {
            let res: VerifyUserResult = await this.fetchClient();
            if (!res.success) {
                LOG.error(`LDAPAuth.verifyUser: ${res.error}`, LOG.LS.eAUTH);
                return res;
            }

            // Step 2: Bind Packrat Service Account
            res = await this.bindService();
            if (!res.success)
                return res;

            // Step 3: Search for passed user by email
            const resUserSearch: UserSearchResult = await this.searchForUser(this._ldapConfig, email);
            if (!resUserSearch.success|| !resUserSearch.DN)
                return resUserSearch;

            //Step 4: If user is found, bind on their credentials
            return await this.bindUser(resUserSearch.DN, email, password);
        } catch (error) {
            LOG.error('LDAPAuth.verifyUser', LOG.LS.eAUTH, error);
            return { success: false, error: JSON.stringify(error) };
        }
    }

    private async fetchClient(): Promise<VerifyUserResult> {
        if (this._client)
            return { success: true };

        // Step 1: Create a ldap client using server address
        this._client = LDAP.createClient({ url: this._ldapConfig.server });

        // this is needed to avoid nodejs crash of server when the LDAP connection is unavailable
        this._client.on('error', error => {
            const errorMessage: string | undefined = (error instanceof Error) ? error.message : undefined;
            if (errorMessage && errorMessage.includes('ECONNRESET'))
                LOG.info('LDAPAuth.fetchClient ECONNRESET; destroying old LDAP client', LOG.LS.eAUTH);
            else
                LOG.error('LDAPAuth.fetchClient', LOG.LS.eAUTH, error);

            if (this._client) {
                this._client.destroy();
                this._client = null;
            }
        });
        return { success: true };
    }

    private async bindService(): Promise<VerifyUserResult> {
        if (!this._client)
            return { success: false, error: 'LDAPClient is null' };
        let ldapBind: string = this._ldapConfig.CN;
        if (ldapBind)
            ldapBind += this._ldapConfig.OU.length > 3 ? `,${this._ldapConfig.OU}` : ``;
        if (ldapBind)
            ldapBind += `,${this._ldapConfig.DC}`;
        const client: LDAP.Client = this._client;
        const password: string = this._ldapConfig.password;
        return new Promise<VerifyUserResult>(function(resolve) {
            client.bind(ldapBind, password, (err: any): void => {
                if (err) {
                    LOG.error(`LDAPAuth.bindService failed: ${JSON.stringify(err)}`, LOG.LS.eAUTH);
                    resolve({ success: false, error: 'Unable to connect to LDAP server' });
                } else
                    resolve({ success: true });
            });
        });
    }

    private async searchForUser(ldapConfig: LDAPConfig, email: string): Promise<UserSearchResult> {
        if (!this._client)
            return { success: false, error: 'LDAPClient is null', DN: null };

        // LDAP Search Options
        const searchOptions: LDAP.SearchOptions = {
            scope: 'sub',
            filter: '(mail=' + email + ')', // (Searches on mail value)
            attributes: ['cn'] ,// return cn value
            sizeLimit: 1, // return only one result
            paged: true,
        };

        let searchComplete: boolean = false;
        const client: LDAP.Client = this._client;

        return new Promise<UserSearchResult>(function(resolve) {
            client.search(ldapConfig.DC, searchOptions, (err: any, res: LDAP.SearchCallbackResponse): void => {
                if (err) {
                    const error: string = `Unable to locate ${email}`;
                    LOG.error(`LDAPAuth.searchForUser ${error}`, LOG.LS.eAUTH);
                    resolve({ success: false, error, DN: null });
                }

                res.on('searchEntry', (entry: any) => {
                    LOG.info(`LDAPAuth.searchForUser found ${email}: ${JSON.stringify(entry.objectName)}`, LOG.LS.eAUTH);
                    searchComplete = true;
                    resolve({ success: true, DN: entry.objectName });
                });

                res.on('error', (err: any) => {
                    const error: string = `Unable to locate ${email}`;
                    LOG.error(`LDAPAuth.searchForUser ${error}`, LOG.LS.eAUTH, err);
                    resolve({ success: false, error, DN: null });
                });

                res.on('end', (result: any) => {
                    if (!searchComplete) {
                        result;
                        const error: string = `Unable to locate ${email}`;
                        LOG.error(`LDAPAuth.searchForUser ${error}`, LOG.LS.eAUTH);
                        resolve({ success: false, error, DN: null });
                    }
                });
            });
        });
    }

    private async bindUser(DN: string, email: string, password: string): Promise<VerifyUserResult> {
        if (!this._client)
            return { success: false, error: 'LDAPClient is null' };
        const client: LDAP.Client = this._client;
        return new Promise<VerifyUserResult>(function(resolve) {
            client.bind(DN, password, (err: any): void => {
                if (err) {
                    err;
                    const error: string = `Invalid password for ${email}`;
                    LOG.error(`LDAPAuth.bindUser ${error}`, LOG.LS.eAUTH);
                    resolve({ success: false, error });
                } else
                    resolve({ success: true });
            });
        });
    }
}

export default LDAPAuth;
