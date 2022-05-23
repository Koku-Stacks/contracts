import * as fs from 'fs';

interface ChangeReference {
    preceding_line: string;
    filename: string;
    replacement_line: string;
};

const chunk_size = parseInt(process.argv[2]);

function number_to_clar_uint(uint: number) {
    return `u${uint.toString()}`
}

const chunk_size_line_ts = chunk_size.toString();
const chunk_size_line_clar = number_to_clar_uint(chunk_size);

function produce_base_indices_shift_list_line(chunk_size: number) {
    const zero_based_range = Array.from(Array(chunk_size).keys());

    const one_based_range = zero_based_range.map(x => x + 1);

    const clar_uint_strings = one_based_range.map(number_to_clar_uint);

    const base_indices_shift_list_line = clar_uint_strings.join(" ");

    return base_indices_shift_list_line;
}

const base_indices_shift_list_line = produce_base_indices_shift_list_line(chunk_size);

const change_references: ChangeReference[] = [
    {
        preceding_line: "// ref-1",
        filename: "tests/futures-market-simulations_test.ts",
        replacement_line: chunk_size_line_ts
    },
    {
        preceding_line: ";; ref-2",
        filename: "contracts/futures-market.clar",
        replacement_line: chunk_size_line_clar
    },
    {
        preceding_line: ";; ref-3",
        filename: "contracts/futures-market.clar",
        replacement_line: base_indices_shift_list_line
    },
    {
        preceding_line: "// ref-4",
        filename: "tests/futures-market-basic_test.ts",
        replacement_line: chunk_size_line_ts
    }
];

function perform_change(change_reference: ChangeReference) {
    const file_content = fs.readFileSync(change_reference.filename).toString();

    const file_content_lines = file_content.split('\n');

    const preceding_line_index = file_content_lines.indexOf(change_reference.preceding_line);

    const replacement_line_index = preceding_line_index + 1;

    let changed_file_content_lines = file_content_lines;
    changed_file_content_lines[replacement_line_index] = change_reference.replacement_line;

    const changed_file_content = changed_file_content_lines.join('\n');

    fs.writeFileSync(change_reference.filename, changed_file_content);
}

function service() {
    for (const change_reference of change_references) {
        perform_change(change_reference)
    }
}

service();