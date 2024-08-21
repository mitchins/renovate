import Git from 'simple-git';
import upath from 'upath';
import { GlobalConfig } from '../../../config/global';
import { logger } from '../../../logger';
import { readLocalFile } from '../../../util/fs';
import { getGitEnvironmentVariables } from '../../../util/git/auth';
import type { UpdateDependencyConfig } from '../types';

export default async function updateDependency({
  fileContent,
  upgrade,
}: UpdateDependencyConfig): Promise<string | null> {
  const localDir = GlobalConfig.get('localDir');
  const gitSubmoduleAuthEnvironmentVariables = getGitEnvironmentVariables([
    'git-tags',
    'git-refs',
  ]);
  const gitEnv = {
    // pass all existing env variables
    ...process.env,
    // add all known git Variables
    ...gitSubmoduleAuthEnvironmentVariables,
  };
  const git = Git(localDir).env(gitEnv);
  const submoduleGit = Git(upath.join(localDir, upgrade.depName));

  try {
    await git.submoduleUpdate(['--init', upgrade.depName!]);
    await submoduleGit.checkout([upgrade.newDigest!]);
    if (upgrade.newValue && upgrade.currentValue !== upgrade.newValue) {
      await git.subModule([
        'set-branch',
        '--branch',
        upgrade.newValue,
        upgrade.depName!,
      ]);
      const updatedPackageContent = await readLocalFile(
        upgrade.packageFile!,
        'utf8',
      );
      return updatedPackageContent!;
    }
    return fileContent;
  } catch (err) {
    logger.debug({ err }, 'submodule checkout error');
    return null;
  }
}
