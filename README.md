# ms-graph-sharepoint
Microsoft Graph module to helps upload files to sharepoint

## Installing
Install globally:

    npm install -g @maykoncapellari/msgraph-sharepoint


## Using

Import in NodeJS script:

    import { MsGraphService } from '@maykoncapellari/msgraph-sharepoint';

    const msService = new MsGraphService({ ...params });
    await msService.signIn();
    // Will read '~/attachmentsDir/myfile.pdf' and put on 'me/drive/root/My Sharepoint Docs/myfile.pdf' on sharepoint
    await msService.uploadFile({ attachmentsDir: '~/attachmentsDir', folderName: 'My Sharepoint Docs', file: 'myfile.pdf' });
    const profile = await msService.requestGraphGet('me'); // Get my profile data
    await msService.logout();