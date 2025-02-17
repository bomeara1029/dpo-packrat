import { gql } from 'apollo-server-express';

const getUnitsFromNameSearch = gql`
    query getUnitsFromNameSearch($input: GetUnitsFromNameSearchInput!) {
        getUnitsFromNameSearch(input: $input) {
            Units {
                idUnit
                Name
                Abbreviation
                SystemObject {
                    idSystemObject
                }
            }
        }
    }
`;

export default getUnitsFromNameSearch;