export interface IERC721WrappedMeta {
  name: string;
  description: string;
  image: string;
  wrapped: {
    origin: string;
    tokenId: string;
    contract: string;
    original_uri: string;
  };
}
