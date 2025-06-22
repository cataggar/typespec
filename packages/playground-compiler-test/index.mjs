import { createTestRunner } from '@typespec/playground/types';

async function test() {
    let runner = await createTestRunner();
    let diagnostics = await runner.compile('model Bar {}');
    console.log(diagnostics);
}

test();
