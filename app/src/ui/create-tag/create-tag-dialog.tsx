import * as React from 'react'
import _ from 'lodash'

import { Repository } from '../../models/repository'
import { Dispatcher } from '../dispatcher'
import { Dialog, DialogError, DialogContent, DialogFooter } from '../dialog'

import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { startTimer } from '../lib/timing'
import { Ref } from '../lib/ref'
import { RefNameTextBox } from '../lib/ref-name-text-box'

interface ICreateTagProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void
  readonly targetCommitSha: string
  readonly initialName?: string
  readonly localTags: Map<string, string> | null
}

interface ICreateTagState {
  readonly tagName: string

  /**
   * Note: once tag creation has been initiated this value stays at true
   * and will never revert to being false. If the tag creation operation
   * fails this dialog will still be dismissed and an error dialog will be
   * shown in its place.
   */
  readonly isCreatingTag: boolean
  readonly previousTags: Array<string> | null
}

const MaxTagNameLength = 245

/** The Create Tag component. */
export class CreateTag extends React.Component<
  ICreateTagProps,
  ICreateTagState
> {
  public constructor(props: ICreateTagProps) {
    super(props)

    this.state = {
      tagName: props.initialName || '',
      isCreatingTag: false,
      previousTags: this.getExistingTagsFiltered(),
    }
  }

  public render() {
    const error = this.getCurrentError()
    const disabled = error !== null || this.state.tagName.length === 0
    const lastThreeTags = _.takeRight(this.state.previousTags, 3)

    return (
      <Dialog
        id="create-tag"
        title={__DARWIN__ ? 'Create a Tag' : 'Create a tag'}
        onSubmit={this.createTag}
        onDismissed={this.props.onDismissed}
        loading={this.state.isCreatingTag}
        disabled={this.state.isCreatingTag}
      >
        {error && <DialogError>{error}</DialogError>}

        <DialogContent>
          <RefNameTextBox
            label="Name"
            initialValue={this.props.initialName}
            onValueChange={this.updateTagName}
          />

          {this.state.previousTags !== null && (
            <>
              <p>Previous Tags</p>
              {lastThreeTags.length === 0 ? (
                <>
                  <Ref>{`No matches found for '${this.state.tagName}'`}</Ref>
                </>
              ) : (
                lastThreeTags.map((item: string, index: number) => (
                  <>
                    <Ref key={index}>{item}</Ref>{' '}
                  </>
                ))
              )}
            </>
          )}
        </DialogContent>

        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText={__DARWIN__ ? 'Create Tag' : 'Create tag'}
            okButtonDisabled={disabled}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private getCurrentError(): JSX.Element | null {
    if (this.state.tagName.length > MaxTagNameLength) {
      return (
        <>The tag name cannot be longer than {MaxTagNameLength} characters</>
      )
    }

    const alreadyExists =
      this.props.localTags && this.props.localTags.has(this.state.tagName)
    if (alreadyExists) {
      return (
        <>
          A tag named <Ref>{this.state.tagName}</Ref> already exists
        </>
      )
    }

    return null
  }

  private getExistingTagsFiltered(filter: string = ''): Array<string> | null {
    if (this.props.localTags === null) {
      return null
    }
    const previousTags = Array.from(this.props.localTags.keys())
    return previousTags.filter(item => item.includes(filter))
  }

  private updateTagName = (tagName: string) => {
    this.setState({
      tagName,
      previousTags: this.getExistingTagsFiltered(tagName),
    })
  }

  private createTag = async () => {
    const name = this.state.tagName
    const repository = this.props.repository

    if (name.length > 0) {
      this.setState({ isCreatingTag: true })

      const timer = startTimer('create tag', repository)
      await this.props.dispatcher.createTag(
        repository,
        name,
        this.props.targetCommitSha
      )
      timer.done()

      this.props.onDismissed()
    }
  }
}
