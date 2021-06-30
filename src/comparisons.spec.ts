// import { Change, PropertyAdded, PropertyDeleted, PropertyChanged, ArrayChanged, excludeContentReplacer } from "./comparisons"
// import { expect } from "chai";

// describe('verify excludeContentReplacer still works', () => {
//     const changes: Change[] = [
//         // note that these are completely arbitrary!
//         new PropertyAdded('/left', '/right/added', "I'm only on the right"),
//         new PropertyDeleted('/left/deleted', "I'm only on the left", '/right'),
//         new PropertyChanged('I\'m different here', '/left/changed', 'Then I am here!', '/right/changed'),
//         new ArrayChanged('/left/array', '/right/array', [
//             {
//                 'rightElement': 'I am an array item only on the right side',
//                 'rightPointer': '/right/array/0'
//             }
//         ], [
//             {
//                 'leftElement': 'I am an array item only on the left side',
//                 'leftPointer': '/left/array/0'
//             }
//         ], [])
//     ];

//     // convert object to and from json twice, once with a replacer and once without
//     const unreplacedStr = JSON.stringify(changes);
//     const replacedStr = JSON.stringify(changes, excludeContentReplacer);
//     const replaced = JSON.parse(replacedStr);

//     it('basic equality test', () => {
//         expect(unreplacedStr).to.not.equal(replacedStr);
//     });

//     it('assert properties have been removed', () => {
//         expect(replaced[0]).does.not.have.property('addedElement');
//         expect(replaced[1]).does.not.have.property('deletedElement');
//         expect(replaced[2]).does.not.have.property('leftElement');
//         expect(replaced[2]).does.not.have.property('rightElement');
//     });

//     it('assert array items have been transformed', () => {
//         const arrayChanged = replaced[3];
//         expect(arrayChanged['addedItems'][0]).to.equal('/right/array/0');
//         expect(arrayChanged['removedItems'][0]).to.equal('/left/array/0');
//     })
// })
