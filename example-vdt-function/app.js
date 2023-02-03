const {
  utils: api,
  vsimport: ImportApi,
  user: UserApi,
  item: ItemApi,
} = require('@vidispine/vdt-api');
const { createMetadataType, parseMetadataType } = require('@vidispine/vdt-js');

const headersToLowerCase = (headers) =>
  Object.entries(headers).reduce((a, [key, value]) => ({ ...a, [key.toLowerCase()]: value }), {});

const { VIDISPINE_URL } = process.env;
const TOKEN_HEADER = 'token';

module.exports.handler = async (event) => {
  const headers = headersToLowerCase(event.headers || {});
  const { [TOKEN_HEADER]: token } = headers;
  try {
    /**
     * api.login sets the axios client configuration for all subsequent requests
     * Also accepts "username" and "password" params
     */
    api.login({ baseURL: VIDISPINE_URL, token });
    /**
     * Check server is online and credentials are valid
     */
    const { data: username } = await UserApi.whoAmI(); // Check server is online and credentials are valid
    console.log(`Authenticated as ${username} to ${VIDISPINE_URL}`);
    /**
     * createMetadataType function turns simple key-value into a MetadataDocument
     * https://vidispine.github.io/vdt/dev/?path=/story/vdt-js-metadata-createmetadatatype--field-basic
     */
    const metadataDocument = createMetadataType({ title: 'MyTitle' });
    /**
     * Creates a placeholder and returns the new item id
     * https://vidispine.github.io/vdt/dev/vdt-api/#vsimportcreateimportplaceholder
     * https://apidoc.vidispine.com/22.3/ref/item/import.html#create-a-placeholder-item
     */
    const {
      data: { id: itemId },
      status: statusCode,
    } = await ImportApi.createImportPlaceholder({
      metadataDocument,
      queryParams: { container: 1 },
    });
    /**
     * Get the new item's metadata
     * https://vidispine.github.io/vdt/dev/vdt-api/#itemgetitem
     * https://apidoc.vidispine.com/22.3/ref/item-content.html#get-information
     */
    const { data: itemType } = await ItemApi.getItem({
      itemId,
      queryParams: { content: ['metadata'] },
    });

    /**
     * Parses the metadata back into a simple key-value
     * https://vidispine.github.io/vdt/dev/?path=/docs/vdt-js-metadata-parsemetadatatype--flat
     */
    const { metadata: metadataType } = itemType;
    const metadata = parseMetadataType(metadataType, { flat: true, arrayOnSingleValue: false });

    return {
      statusCode,
      body: JSON.stringify(metadata),
    };
  } catch (err) {
    console.log(err);
    return err;
  }
};
